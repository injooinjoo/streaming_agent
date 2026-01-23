/**
 * BaseAdapter - 플랫폼 어댑터 공통 인터페이스
 *
 * 모든 스트리밍 플랫폼 어댑터는 이 클래스를 상속받아 구현합니다.
 * EventEmitter 패턴을 사용하여 이벤트를 발생시킵니다.
 */

const EventEmitter = require("events");

class BaseAdapter extends EventEmitter {
  constructor(options = {}) {
    super();

    this.platform = "unknown";
    this.channelId = options.channelId || null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectDelay = options.reconnectDelay || 1000;
  }

  /**
   * 플랫폼에 연결
   * @abstract
   */
  async connect() {
    throw new Error("connect() must be implemented by subclass");
  }

  /**
   * 플랫폼에서 연결 해제
   * @abstract
   */
  disconnect() {
    throw new Error("disconnect() must be implemented by subclass");
  }

  /**
   * 재연결 시도
   * @protected
   */
  async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit("error", new Error(`Failed to reconnect after ${this.maxReconnectAttempts} attempts`));
      return false;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000 // 최대 30초
    );

    await this.sleep(delay);

    try {
      await this.connect();
      this.reconnectAttempts = 0;
      return true;
    } catch (error) {
      console.error(`[${this.platform}] Reconnect failed:`, error.message);
      return this.attemptReconnect();
    }
  }

  /**
   * 연결 상태 리셋
   * @protected
   */
  resetConnection() {
    this.isConnected = false;
  }

  /**
   * 연결 성공 처리
   * @protected
   */
  onConnected() {
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.emit("connected", { platform: this.platform, channelId: this.channelId });
  }

  /**
   * 연결 해제 처리
   * @protected
   */
  onDisconnected() {
    this.isConnected = false;
    this.emit("disconnected", { platform: this.platform, channelId: this.channelId });
  }

  /**
   * 이벤트 발생 (정규화된 이벤트)
   * @param {Object} event - 정규화된 이벤트 객체
   */
  emitEvent(event) {
    this.emit("event", event);
  }

  /**
   * 에러 발생
   * @param {Error} error
   */
  emitError(error) {
    this.emit("error", error);
  }

  /**
   * 유틸리티: sleep
   * @param {number} ms
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 어댑터 정보 반환
   */
  getInfo() {
    return {
      platform: this.platform,
      channelId: this.channelId,
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

module.exports = BaseAdapter;
