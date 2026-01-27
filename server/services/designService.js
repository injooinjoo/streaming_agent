/**
 * Design Service
 * Business logic for design customizer and marketplace
 * Uses cross-database compatible helpers from connections.js
 */

const { getOne, getAll, runQuery, isPostgres } = require('../db/connections');

/**
 * Get placeholder for parameterized queries
 * SQLite uses ?, PostgreSQL uses $1, $2, etc.
 */
const getPlaceholder = (index) => isPostgres() ? `$${index}` : '?';

/**
 * Create Design Service
 * @param {Object} db - Database instance (not used directly, for backward compatibility)
 * @param {Server} io - Socket.io server instance
 * @returns {Object} Design service methods
 */
const createDesignService = (db, io) => {
  return {
    // ===== CRUD Operations =====

    /**
     * Create a new design
     * @param {number} userId - User ID
     * @param {Object} data - Design data
     * @returns {Promise<Object>} Created design
     */
    async create(userId, data) {
      const p = (...args) => args.map((_, i) => getPlaceholder(i + 1)).join(', ');

      const result = await runQuery(
        `INSERT INTO designs (creator_id, name, description, category, tags, design_data, status, created_at)
         VALUES (${p(1,2,3,4,5,6,7,8)})`,
        [
          userId,
          data.name,
          data.description || null,
          data.category,
          data.tags ? JSON.stringify(data.tags) : null,
          JSON.stringify(data.design_data),
          'draft',
          new Date().toISOString()
        ]
      );

      const designId = result.lastID || result.insertId || result.rows?.[0]?.id;
      return this.getById(designId);
    },

    /**
     * Get design by ID
     * @param {number} id - Design ID
     * @returns {Promise<Object|null>}
     */
    async getById(id) {
      const p1 = getPlaceholder(1);
      const design = await getOne(
        `SELECT d.*, u.display_name as creator_name, u.email as creator_email
         FROM designs d
         LEFT JOIN users u ON d.creator_id = u.id
         WHERE d.id = ${p1}`,
        [id]
      );

      if (design) {
        design.design_data = JSON.parse(design.design_data || '{}');
        design.tags = design.tags ? JSON.parse(design.tags) : [];
      }

      return design;
    },

    /**
     * Get designs by user
     * @param {number} userId - User ID
     * @param {Object} options - Filter options
     * @returns {Promise<Array>}
     */
    async getByUser(userId, options = {}) {
      const { status, category, limit = 50, offset = 0 } = options;
      const params = [userId];
      let whereClause = `WHERE d.creator_id = ${getPlaceholder(1)}`;
      let paramIndex = 2;

      if (status) {
        whereClause += ` AND d.status = ${getPlaceholder(paramIndex)}`;
        params.push(status);
        paramIndex++;
      }

      if (category) {
        whereClause += ` AND d.category = ${getPlaceholder(paramIndex)}`;
        params.push(category);
        paramIndex++;
      }

      const designs = await getAll(
        `SELECT d.*, u.display_name as creator_name
         FROM designs d
         LEFT JOIN users u ON d.creator_id = u.id
         ${whereClause}
         ORDER BY d.created_at DESC
         LIMIT ${getPlaceholder(paramIndex)} OFFSET ${getPlaceholder(paramIndex + 1)}`,
        [...params, limit, offset]
      );

      return designs.map(d => ({
        ...d,
        design_data: JSON.parse(d.design_data || '{}'),
        tags: d.tags ? JSON.parse(d.tags) : []
      }));
    },

    /**
     * Update design
     * @param {number} id - Design ID
     * @param {number} userId - User ID (for ownership check)
     * @param {Object} data - Updated data
     * @returns {Promise<Object|null>}
     */
    async update(id, userId, data) {
      const p1 = getPlaceholder(1);
      const p2 = getPlaceholder(2);

      // Check ownership and status
      const design = await getOne(
        `SELECT * FROM designs WHERE id = ${p1} AND creator_id = ${p2}`,
        [id, userId]
      );

      if (!design) return null;
      if (design.status === 'pending') {
        throw new Error('심사 중인 디자인은 수정할 수 없습니다.');
      }

      const updates = [];
      const params = [];
      let paramIndex = 1;

      const allowedFields = ['name', 'description', 'category', 'tags', 'design_data', 'thumbnail_url'];

      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          updates.push(`${field} = ${getPlaceholder(paramIndex)}`);
          if (field === 'design_data' || field === 'tags') {
            params.push(JSON.stringify(data[field]));
          } else {
            params.push(data[field]);
          }
          paramIndex++;
        }
      }

      // Reset status to draft if rejected design is being edited
      if (design.status === 'rejected') {
        updates.push(`status = ${getPlaceholder(paramIndex)}`);
        params.push('draft');
        paramIndex++;
      }

      params.push(id);
      params.push(userId);

      await runQuery(
        `UPDATE designs SET ${updates.join(', ')} WHERE id = ${getPlaceholder(paramIndex)} AND creator_id = ${getPlaceholder(paramIndex + 1)}`,
        params
      );

      return this.getById(id);
    },

    /**
     * Delete design
     * @param {number} id - Design ID
     * @param {number} userId - User ID (for ownership check)
     * @returns {Promise<boolean>}
     */
    async delete(id, userId) {
      const p1 = getPlaceholder(1);
      const p2 = getPlaceholder(2);

      const design = await getOne(
        `SELECT * FROM designs WHERE id = ${p1} AND creator_id = ${p2}`,
        [id, userId]
      );

      if (!design) return false;
      if (design.status === 'pending') {
        throw new Error('심사 중인 디자인은 삭제할 수 없습니다.');
      }

      const result = await runQuery(
        `DELETE FROM designs WHERE id = ${p1} AND creator_id = ${p2}`,
        [id, userId]
      );

      return (result.changes || result.rowCount || 0) > 0;
    },

    // ===== Review Workflow =====

    /**
     * Submit design for review
     * @param {number} id - Design ID
     * @param {number} userId - User ID
     * @returns {Promise<Object|null>}
     */
    async submit(id, userId) {
      const p1 = getPlaceholder(1);
      const p2 = getPlaceholder(2);

      const design = await getOne(
        `SELECT * FROM designs WHERE id = ${p1} AND creator_id = ${p2}`,
        [id, userId]
      );

      if (!design) return null;
      if (design.status !== 'draft' && design.status !== 'rejected') {
        throw new Error('임시저장 또는 거절된 디자인만 제출할 수 있습니다.');
      }

      await runQuery(
        `UPDATE designs SET status = ${p1}
         WHERE id = ${p2}`,
        ['pending', id]
      );

      return this.getById(id);
    },

    /**
     * Approve design (Admin only)
     * @param {number} id - Design ID
     * @param {number} adminId - Admin user ID
     * @returns {Promise<Object|null>}
     */
    async approve(id, adminId) {
      const p1 = getPlaceholder(1);

      const design = await getOne(`SELECT * FROM designs WHERE id = ${p1}`, [id]);
      if (!design) return null;
      if (design.status !== 'pending') {
        throw new Error('심사 대기 중인 디자인만 승인할 수 있습니다.');
      }

      const p2 = getPlaceholder(2);

      await runQuery(
        `UPDATE designs SET status = ${p1}
         WHERE id = ${p2}`,
        ['approved', id]
      );

      // Create or update creator profile
      await this._ensureCreatorProfile(design.creator_id);

      // Notify user
      if (io) {
        io.emit('design-approved', { designId: id, userId: design.creator_id });
      }

      return this.getById(id);
    },

    /**
     * Reject design (Admin only)
     * @param {number} id - Design ID
     * @param {number} adminId - Admin user ID
     * @param {string} reason - Rejection reason
     * @returns {Promise<Object|null>}
     */
    async reject(id, adminId, reason) {
      const p1 = getPlaceholder(1);

      const design = await getOne(`SELECT * FROM designs WHERE id = ${p1}`, [id]);
      if (!design) return null;
      if (design.status !== 'pending') {
        throw new Error('심사 대기 중인 디자인만 거절할 수 있습니다.');
      }

      if (!reason || reason.trim().length === 0) {
        throw new Error('거절 사유를 입력해주세요.');
      }

      const p2 = getPlaceholder(2);

      await runQuery(
        `UPDATE designs SET status = ${p1}
         WHERE id = ${p2}`,
        ['rejected', id]
      );

      // Notify user
      if (io) {
        io.emit('design-rejected', { designId: id, userId: design.creator_id, reason: reason.trim() });
      }

      return this.getById(id);
    },

    /**
     * Get pending designs for review (Admin only)
     * @param {Object} options - Filter options
     * @returns {Promise<Array>}
     */
    async getPending(options = {}) {
      const { category, limit = 50, offset = 0 } = options;
      const params = ['pending'];
      let whereClause = `WHERE d.status = ${getPlaceholder(1)}`;
      let paramIndex = 2;

      if (category) {
        whereClause += ` AND d.category = ${getPlaceholder(paramIndex)}`;
        params.push(category);
        paramIndex++;
      }

      const designs = await getAll(
        `SELECT d.*, u.display_name as creator_name, u.email as creator_email
         FROM designs d
         LEFT JOIN users u ON d.creator_id = u.id
         ${whereClause}
         ORDER BY d.created_at ASC
         LIMIT ${getPlaceholder(paramIndex)} OFFSET ${getPlaceholder(paramIndex + 1)}`,
        [...params, limit, offset]
      );

      const countRow = await getOne(
        `SELECT COUNT(*) as count FROM designs d ${whereClause}`,
        params.slice(0, paramIndex - 1)
      );

      return {
        designs: designs.map(d => ({
          ...d,
          design_data: JSON.parse(d.design_data || '{}'),
          tags: d.tags ? JSON.parse(d.tags) : []
        })),
        total: countRow?.count || 0
      };
    },

    // ===== Marketplace =====

    /**
     * Get approved designs for marketplace
     * @param {Object} options - Filter options
     * @returns {Promise<Object>}
     */
    async getApproved(options = {}) {
      const { category, search, sortBy = 'newest', limit = 20, offset = 0 } = options;
      const params = ['approved'];
      let whereClause = `WHERE d.status = ${getPlaceholder(1)}`;
      let paramIndex = 2;

      if (category && category !== 'all') {
        whereClause += ` AND d.category = ${getPlaceholder(paramIndex)}`;
        params.push(category);
        paramIndex++;
      }

      if (search) {
        whereClause += ` AND (d.name LIKE ${getPlaceholder(paramIndex)} OR d.description LIKE ${getPlaceholder(paramIndex + 1)})`;
        params.push(`%${search}%`);
        params.push(`%${search}%`);
        paramIndex += 2;
      }

      let orderBy = 'ORDER BY d.created_at DESC';
      if (sortBy === 'popular') orderBy = 'ORDER BY d.download_count DESC';
      if (sortBy === 'rating') orderBy = 'ORDER BY d.average_rating DESC';

      const designs = await getAll(
        `SELECT d.*, u.display_name as creator_name, c.verified as creator_verified
         FROM designs d
         LEFT JOIN users u ON d.creator_id = u.id
         LEFT JOIN creators c ON d.creator_id = c.user_id
         ${whereClause}
         ${orderBy}
         LIMIT ${getPlaceholder(paramIndex)} OFFSET ${getPlaceholder(paramIndex + 1)}`,
        [...params, limit, offset]
      );

      const countRow = await getOne(
        `SELECT COUNT(*) as count FROM designs d ${whereClause}`,
        params.slice(0, paramIndex - 1)
      );

      return {
        designs: designs.map(d => ({
          ...d,
          design_data: JSON.parse(d.design_data || '{}'),
          tags: d.tags ? JSON.parse(d.tags) : []
        })),
        total: countRow?.count || 0
      };
    },

    /**
     * Install design to user settings
     * @param {number} designId - Design ID
     * @param {number} userId - User ID
     * @param {string} overlayHash - User's overlay hash
     * @returns {Promise<boolean>}
     */
    async install(designId, userId, overlayHash) {
      const p1 = getPlaceholder(1);
      const p2 = getPlaceholder(2);

      const design = await getOne(
        `SELECT * FROM designs WHERE id = ${p1} AND status = ${p2}`,
        [designId, 'approved']
      );

      if (!design) {
        throw new Error('승인된 디자인만 설치할 수 있습니다.');
      }

      const designData = JSON.parse(design.design_data || '{}');
      const settingKey = design.category;

      // Save to user settings
      const p3 = getPlaceholder(3);
      const p4 = getPlaceholder(4);

      if (isPostgres()) {
        await runQuery(
          `INSERT INTO user_settings (user_id, setting_key, setting_value, updated_at)
           VALUES (${p1}, ${p2}, ${p3}, CURRENT_TIMESTAMP)
           ON CONFLICT(user_id, setting_key) DO UPDATE SET
             setting_value = EXCLUDED.setting_value,
             updated_at = CURRENT_TIMESTAMP`,
          [userId, settingKey, JSON.stringify(designData)]
        );
      } else {
        await runQuery(
          `INSERT INTO user_settings (user_id, setting_key, setting_value, updated_at)
           VALUES (${p1}, ${p2}, ${p3}, CURRENT_TIMESTAMP)
           ON CONFLICT(user_id, setting_key) DO UPDATE SET
             setting_value = excluded.setting_value,
             updated_at = CURRENT_TIMESTAMP`,
          [userId, settingKey, JSON.stringify(designData)]
        );
      }

      // Increment download count
      await runQuery(
        `UPDATE designs SET download_count = download_count + 1 WHERE id = ${p1}`,
        [designId]
      );

      // Notify overlay
      if (overlayHash && io) {
        io.to(`overlay:${overlayHash}`).emit('settings-updated', { key: settingKey });
      }

      return true;
    },

    /**
     * Update thumbnail
     * @param {number} id - Design ID
     * @param {number} userId - User ID
     * @param {string} thumbnailUrl - Thumbnail URL
     * @returns {Promise<Object|null>}
     */
    async updateThumbnail(id, userId, thumbnailUrl) {
      const p1 = getPlaceholder(1);
      const p2 = getPlaceholder(2);
      const p3 = getPlaceholder(3);
      const p4 = getPlaceholder(4);

      const design = await getOne(
        `SELECT * FROM designs WHERE id = ${p1} AND creator_id = ${p2}`,
        [id, userId]
      );

      if (!design) return null;

      await runQuery(
        `UPDATE designs SET thumbnail_url = ${p1} WHERE id = ${p2}`,
        [thumbnailUrl, id]
      );

      return this.getById(id);
    },

    // ===== Helper Methods =====

    /**
     * Ensure creator profile exists
     * @param {number} userId - User ID
     * @private
     */
    async _ensureCreatorProfile(userId) {
      const p1 = getPlaceholder(1);

      const creator = await getOne(
        `SELECT * FROM creators WHERE user_id = ${p1}`,
        [userId]
      );

      if (!creator) {
        const user = await getOne(`SELECT * FROM users WHERE id = ${p1}`, [userId]);
        if (user) {
          const p2 = getPlaceholder(2);
          const p3 = getPlaceholder(3);

          await runQuery(
            `INSERT INTO creators (user_id, display_name, avatar_url, created_at)
             VALUES (${p1}, ${p2}, ${p3}, CURRENT_TIMESTAMP)`,
            [userId, user.display_name, user.avatar_url]
          );
        }
      }
    },

    /**
     * Get design statistics (Admin)
     * @returns {Promise<Object>}
     */
    async getStats() {
      const stats = await getOne(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
        FROM designs
      `);

      return {
        total: stats?.total || 0,
        draft: stats?.draft || 0,
        pending: stats?.pending || 0,
        approved: stats?.approved || 0,
        rejected: stats?.rejected || 0
      };
    }
  };
};

module.exports = { createDesignService };
