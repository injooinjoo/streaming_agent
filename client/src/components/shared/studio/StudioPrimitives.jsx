import { useEffect, useRef, useState } from 'react';
import SensitiveValue from '../SensitiveValue';
import { getInitials } from '../../../utils/mediaAssets';

import './StudioPrimitives.css';

const classNames = (...values) => values.filter(Boolean).join(' ');
const DEFAULT_MEDIA_IMAGE =
  'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=1200&q=80';

const MediaFrame = ({
  imageUrl,
  logoUrl,
  label,
  badge,
  aspect = 'landscape',
  accent = 'blue',
  className = '',
}) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const imageRef = useRef(null);
  const resolvedImageUrl = imageUrl || DEFAULT_MEDIA_IMAGE;

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [resolvedImageUrl]);

  useEffect(() => {
    const image = imageRef.current;

    if (resolvedImageUrl && image?.complete && image.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [resolvedImageUrl]);

  return (
    <div
      className={classNames(
        'studio-media-frame',
        `studio-media-frame--${aspect}`,
        `studio-accent--${accent}`,
        loaded && 'is-loaded',
        className
      )}
    >
      {resolvedImageUrl && !failed ? (
        <img
          ref={imageRef}
          src={resolvedImageUrl}
          alt={label || 'media'}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      ) : null}
      <div className="studio-media-frame__skeleton" />
      <div className="studio-media-frame__fallback">
        <span>{getInitials(label)}</span>
        {label ? <small>{label}</small> : null}
      </div>
      <div className="studio-media-frame__scrim" />
      {logoUrl ? (
        <span className="studio-media-frame__logo">
          <img src={logoUrl} alt="" />
        </span>
      ) : null}
      {badge ? <span className="studio-media-frame__badge">{badge}</span> : null}
    </div>
  );
};

export const AppShell = ({ children, accent = 'blue', className = '' }) => (
  <div className={classNames('studio-app-shell', `studio-accent--${accent}`, className)}>
    {children}
  </div>
);

export const ServiceRail = ({ children, accent = 'amber', className = '' }) => (
  <div className={classNames('studio-service-rail', `studio-accent--${accent}`, className)}>
    {children}
  </div>
);

export const SidebarSection = ({ title, children, compact = false, className = '' }) => (
  <section
    className={classNames(
      'studio-sidebar-section',
      compact && 'studio-sidebar-section--compact',
      className
    )}
  >
    {title ? <div className="studio-sidebar-section__title">{title}</div> : null}
    <div className="studio-sidebar-section__body">{children}</div>
  </section>
);

export const StatusBadge = ({ children, icon, tone = 'default', className = '' }) => (
  <span className={classNames('studio-status-badge', `studio-status-badge--${tone}`, className)}>
    {icon ? <span className="studio-status-badge__icon">{icon}</span> : null}
    <span>{children}</span>
  </span>
);

export const ActionCluster = ({ children, align = 'left', className = '' }) => (
  <div className={classNames('studio-action-cluster', `studio-action-cluster--${align}`, className)}>
    {children}
  </div>
);

export const LogoChip = ({ logoUrl, label, subtle = false, className = '' }) => (
  <span className={classNames('studio-logo-chip', subtle && 'studio-logo-chip--subtle', className)}>
    {logoUrl ? (
      <span className="studio-logo-chip__icon">
        <img src={logoUrl} alt="" />
      </span>
    ) : null}
    <span>{label}</span>
  </span>
);

export const CompactMetric = ({
  label,
  value,
  sensitive = false,
  className = '',
}) => (
  <div className={classNames('studio-compact-metric', className)}>
    <span>{label}</span>
    {sensitive ? <SensitiveValue as="strong">{value}</SensitiveValue> : <strong>{value}</strong>}
  </div>
);

export const InsightStrip = ({ items = [], className = '' }) => (
  <div className={classNames('studio-insight-strip', className)}>
    {items.map((item, index) => (
      <article key={item.title || `${item}-${index}`} className="studio-insight-strip__item">
        <span className="studio-insight-strip__kicker">{item.kicker || 'Insight'}</span>
        <strong>{item.title || item}</strong>
        {item.body ? <p>{item.body}</p> : null}
      </article>
    ))}
  </div>
);

export const PageHero = ({
  eyebrow,
  title,
  description,
  actions,
  aside,
  accent = 'blue',
  className = '',
}) => (
  <section className={classNames('studio-page-hero', `studio-accent--${accent}`, className)}>
    <div className="studio-page-hero__content">
      {eyebrow ? <div className="studio-page-hero__eyebrow">{eyebrow}</div> : null}
      <div className="studio-page-hero__copy">
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <ActionCluster className="studio-page-hero__actions">{actions}</ActionCluster> : null}
    </div>
    {aside ? <div className="studio-page-hero__aside">{aside}</div> : null}
  </section>
);

export const MediaHero = ({
  eyebrow,
  title,
  description,
  actions,
  media,
  stats,
  insights,
  overlay,
  accent = 'blue',
  className = '',
}) => (
  <section className={classNames('studio-media-hero', `studio-accent--${accent}`, className)}>
    <div className="studio-media-hero__copy">
      {eyebrow ? <div className="studio-media-hero__eyebrow">{eyebrow}</div> : null}
      <div className="studio-media-hero__headline">
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {stats?.length ? (
        <div className="studio-media-hero__metrics">
          {stats.map((item) => (
            <CompactMetric
              key={`${item.label}-${item.value}`}
              label={item.label}
              value={item.value}
              sensitive={item.sensitive}
            />
          ))}
        </div>
      ) : null}
      {actions ? <ActionCluster className="studio-media-hero__actions">{actions}</ActionCluster> : null}
      {insights?.length ? <InsightStrip items={insights} className="studio-media-hero__insights" /> : null}
    </div>
    <div className="studio-media-hero__visual">
      <MediaFrame
        imageUrl={media?.imageUrl || media?.thumbnailUrl}
        logoUrl={media?.logoUrl}
        label={media?.label || title}
        badge={media?.badge}
        aspect={media?.aspect || 'portrait'}
        accent={accent}
      />
      {overlay ? <div className="studio-media-hero__overlay">{overlay}</div> : null}
    </div>
  </section>
);

export const MetricCard = ({
  label,
  value,
  meta,
  icon,
  tone = 'default',
  accent = 'blue',
  sensitiveValue = false,
  sensitiveMeta = false,
  className = '',
}) => (
  <article
    className={classNames(
      'studio-metric-card',
      `studio-metric-card--${tone}`,
      `studio-accent--${accent}`,
      className
    )}
  >
    <div className="studio-metric-card__top">
      <span className="studio-metric-card__label">{label}</span>
      {icon ? <span className="studio-metric-card__icon">{icon}</span> : null}
    </div>
    {sensitiveValue ? (
      <SensitiveValue as="strong" className="studio-metric-card__value">
        {value}
      </SensitiveValue>
    ) : (
      <strong className="studio-metric-card__value">{value}</strong>
    )}
    {meta ? (
      sensitiveMeta ? (
        <SensitiveValue className="studio-metric-card__meta">{meta}</SensitiveValue>
      ) : (
        <span className="studio-metric-card__meta">{meta}</span>
      )
    ) : null}
  </article>
);

export const PosterCard = ({
  eyebrow,
  title,
  description,
  imageUrl,
  logoUrl,
  badge,
  stats = [],
  action,
  onClick,
  accent = 'blue',
  className = '',
}) => {
  const Component = onClick ? 'button' : 'article';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      className={classNames('studio-poster-card', `studio-accent--${accent}`, className)}
      onClick={onClick}
    >
      <MediaFrame
        imageUrl={imageUrl}
        logoUrl={logoUrl}
        label={title}
        badge={badge}
        aspect="poster"
        accent={accent}
        className="studio-poster-card__media"
      />
      <div className="studio-poster-card__body">
        {eyebrow ? <span className="studio-poster-card__eyebrow">{eyebrow}</span> : null}
        <div className="studio-poster-card__copy">
          <strong>{title}</strong>
          {description ? <p>{description}</p> : null}
        </div>
        {stats.length ? (
          <div className="studio-poster-card__stats">
            {stats.map((item) => (
              <CompactMetric
                key={`${item.label}-${item.value}`}
                label={item.label}
                value={item.value}
                sensitive={item.sensitive}
              />
            ))}
          </div>
        ) : null}
        {action ? <div className="studio-poster-card__action">{action}</div> : null}
      </div>
    </Component>
  );
};

export const EntityCard = ({
  eyebrow,
  title,
  description,
  avatarUrl,
  coverUrl,
  logoUrl,
  badge,
  stats = [],
  action,
  onClick,
  accent = 'blue',
  className = '',
}) => {
  const Component = onClick ? 'button' : 'article';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      className={classNames('studio-entity-card', `studio-accent--${accent}`, className)}
      onClick={onClick}
    >
      <div className="studio-entity-card__cover">
        <MediaFrame
          imageUrl={coverUrl}
          logoUrl={logoUrl}
          label={title}
          badge={badge}
          aspect="landscape"
          accent={accent}
        />
      </div>
      <div className="studio-entity-card__header">
        <div className="studio-entity-card__avatar">
          <MediaFrame imageUrl={avatarUrl} label={title} aspect="square" accent={accent} />
        </div>
        <div className="studio-entity-card__copy">
          {eyebrow ? <span className="studio-entity-card__eyebrow">{eyebrow}</span> : null}
          <strong>{title}</strong>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      {stats.length ? (
        <div className="studio-entity-card__stats">
          {stats.map((item) => (
            <CompactMetric
              key={`${item.label}-${item.value}`}
              label={item.label}
              value={item.value}
              sensitive={item.sensitive}
            />
          ))}
        </div>
      ) : null}
      {action ? <div className="studio-entity-card__action">{action}</div> : null}
    </Component>
  );
};

export const MediaRail = ({
  title,
  description,
  action,
  children,
  className = '',
}) => (
  <section className={classNames('studio-media-rail', className)}>
    {(title || description || action) ? (
      <header className="studio-media-rail__header">
        <div className="studio-media-rail__copy">
          {title ? <h2>{title}</h2> : null}
          {description ? <p>{description}</p> : null}
        </div>
        {action ? <div className="studio-media-rail__action">{action}</div> : null}
      </header>
    ) : null}
    <div className="studio-media-rail__track">{children}</div>
  </section>
);

export const SectionCard = ({
  title,
  description,
  actions,
  children,
  density = 'comfortable',
  accent = 'blue',
  className = '',
}) => (
  <section
    className={classNames(
      'studio-section-card',
      `studio-section-card--${density}`,
      `studio-accent--${accent}`,
      className
    )}
  >
    {(title || description || actions) && (
      <header className="studio-section-card__header">
        <div className="studio-section-card__copy">
          {title ? <h2>{title}</h2> : null}
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? <div className="studio-section-card__actions">{actions}</div> : null}
      </header>
    )}
    <div className="studio-section-card__body">{children}</div>
  </section>
);

export const FilterBar = ({ leading, children, trailing, className = '' }) => (
  <div className={classNames('studio-filter-bar', className)}>
    {leading ? <div className="studio-filter-bar__leading">{leading}</div> : null}
    <div className="studio-filter-bar__body">{children}</div>
    {trailing ? <div className="studio-filter-bar__trailing">{trailing}</div> : null}
  </div>
);

export const FormSection = ({
  title,
  description,
  children,
  accent = 'blue',
  className = '',
}) => (
  <section className={classNames('studio-form-section', `studio-accent--${accent}`, className)}>
    {(title || description) && (
      <header className="studio-form-section__header">
        {title ? <h3>{title}</h3> : null}
        {description ? <p>{description}</p> : null}
      </header>
    )}
    <div className="studio-form-section__body">{children}</div>
  </section>
);

export const StickyActionDock = ({
  primaryAction,
  secondaryAction,
  stickyOnMobile = true,
  className = '',
}) => (
  <div
    className={classNames(
      'studio-sticky-action-dock',
      stickyOnMobile && 'studio-sticky-action-dock--mobile',
      className
    )}
  >
    {secondaryAction ? <div className="studio-sticky-action-dock__secondary">{secondaryAction}</div> : null}
    {primaryAction ? <div className="studio-sticky-action-dock__primary">{primaryAction}</div> : null}
  </div>
);

export const EmptyState = ({
  icon,
  title,
  description,
  action,
  compact = false,
  className = '',
}) => (
  <div className={classNames('studio-empty-state', compact && 'studio-empty-state--compact', className)}>
    {icon ? <div className="studio-empty-state__icon">{icon}</div> : null}
    <div className="studio-empty-state__copy">
      {title ? <h3>{title}</h3> : null}
      {description ? <p>{description}</p> : null}
    </div>
    {action ? <div className="studio-empty-state__action">{action}</div> : null}
  </div>
);
