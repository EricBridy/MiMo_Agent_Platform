/**
 * 极光推送通知服务
 * 处理推送通知的初始化、接收和点击
 */

// 极光推送类型定义
interface JPushModule {
  initilize: (appKey: string) => Promise<void>;
  getRegistrationID: () => Promise<string>;
  setAlias: (alias: string) => Promise<void>;
  deleteAlias: () => Promise<void>;
}

// 推送通知类型
interface PushNotification {
  title?: string;
  content?: string;
  extra?: Record<string, any>;
}

class PushNotificationService {
  private static instance: PushNotificationService;
  private jpush: any = null;
  private initialized = false;

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * 初始化极光推送
   */
  async initilize(appKey?: string): Promise<void> {
    if (this.initialized) {
      console.log('JPush already initialized');
      return;
    }

    try {
      // 动态导入极光推送模块
      // 注意：需要先安装 jpush-react-native 包
      // npm install jpush-react-native
      
      console.log('初始化推送通知服务...');
      
      // 模拟初始化（实际使用时需要安装 JPush SDK）
      // const JPush = require('jpush-react-native').default;
      // await JPush.initilize(appKey);
      // this.jpush = JPush;
      
      this.initialized = true;
      console.log('✅ 推送通知服务初始化成功');
      
      // 设置通知接收监听
      this.setupNotificationListeners();
    } catch (error) {
      console.error('❌ 推送通知服务初始化失败:', error);
    }
  }

  /**
   * 设置通知监听
   */
  private setupNotificationListeners(): void {
    if (!this.jpush) return;

    // 接收通知
    this.jpush.addReceiveCustomMsgListener((message: PushNotification) => {
      console.log('收到推送消息:', message);
      this.handleReceiveNotification(message);
    });

    // 点击通知
    this.jpush.addReceiveOpenNotificationListener((notification: PushNotification) => {
      console.log('点击推送通知:', notification);
      this.handleClickNotification(notification);
    });
  }

  /**
   * 处理接收通知
   */
  private handleReceiveNotification(notification: PushNotification): void {
    // 显示本地通知
    this.showLocalNotification(
      notification.title || 'MiMo Agent',
      notification.content || '',
      notification.extra
    );
  }

  /**
   * 处理点击通知（唤醒应用）
   */
  private handleClickNotification(notification: PushNotification): void {
    const extra = notification.extra;
    
    if (extra?.type === 'wakeup') {
      // 唤醒桌面端
      const deviceId = extra.deviceId;
      console.log('需要唤醒桌面端:', deviceId);
      
      // 触发唤醒流程
      this.triggerWakeup(deviceId);
    }
  }

  /**
   * 触发唤醒流程
   */
  private async triggerWakeup(deviceId: string): Promise<void> {
    try {
      // 连接到桌面端服务器
      // 发送唤醒请求
      console.log('发送唤醒请求到设备:', deviceId);
      
      // 实际实现需要调用 Socket.IO 发送唤醒请求
      // socket.emit('wake:request', { deviceId, ... });
    } catch (error) {
      console.error('唤醒请求失败:', error);
    }
  }

  /**
   * 显示本地通知
   */
  showLocalNotification(title: string, content: string, _extra?: Record<string, any>): void {
    // 在移动端显示本地通知
    // 可以使用 react-native-push-notification 等库
    console.log('本地通知:', title, content);
    
    // 实际实现:
    // PushNotification.localNotification({
    //   title,
    //   message: content,
    //   ...
    // });
  }

  /**
   * 设置别名（用于定向推送）
   */
  async setAlias(alias: string): Promise<void> {
    if (!this.jpush) return;

    try {
      await this.jpush.setAlias(alias);
      console.log('设置别名成功:', alias);
    } catch (error) {
      console.error('设置别名失败:', error);
    }
  }

  /**
   * 删除别名
   */
  async deleteAlias(): Promise<void> {
    if (!this.jpush) return;

    try {
      await this.jpush.deleteAlias();
      console.log('删除别名成功');
    } catch (error) {
      console.error('删除别名失败:', error);
    }
  }

  /**
   * 获取 Registration ID
   */
  async getRegistrationID(): Promise<string | null> {
    if (!this.jpush) return null;

    try {
      const registrationID = await this.jpush.getRegistrationID();
      console.log('Registration ID:', registrationID);
      return registrationID;
    } catch (error) {
      console.error('获取 Registration ID 失败:', error);
      return null;
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    if (!this.jpush) return;

    // 移除监听
    // this.jpush.removeReceiveCustomMsgListener();
    // this.jpush.removeReceiveOpenNotificationListener();
    
    console.log('推送通知服务已清理');
  }
}

export default PushNotificationService.getInstance();
