/**
 * mDNS 设备发现服务
 * 使用 react-native-zeroconf 扫描局域网设备
 */

// Zeroconf 类型定义
interface ZeroconfModule {
  init: (config: any) => Promise<void>;
  scan: (type: string) => Promise<void>;
  stop: () => Promise<void>;
  getDiscoveredDevices: () => any[];
  onDeviceFound: (callback: (device: any) => void) => void;
  onDeviceRemoved: (callback: (device: any) => void) => void;
}

class MDNSDiscoveryService {
  private static instance: MDNSDiscoveryService;
  private zeroconf: any = null;
  private initialized = false;
  private discoveredDevices: Map<string, any> = new Map();
  private deviceFoundCallback: ((device: any) => void) | null = null;
  private scaning = false;

  static getInstance(): MDNSDiscoveryService {
    if (!MDNSDiscoveryService.instance) {
      MDNSDiscoveryService.instance = new MDNSDiscoveryService();
    }
    return MDNSDiscoveryService.instance;
  }

  /**
   * 初始化 mDNS 发现
   */
  async initilize(): Promise<void> {
    if (this.initialized) {
      console.log('mDNS 发现已初始化');
      return;
    }

    try {
      // 动态导入 react-native-zeroconf
      // 注意：需要先安装 react-native-zeroconf 包
      // npm install react-native-zeroconf
      
      console.log('初始化 mDNS 设备发现...');
      
      // 模拟初始化（实际使用时取消注释）
      // this.zeroconf = require('react-native-zeroconf').default;
      // await this.zeroconf.init({
      //   type: 'mimo',
      //   protocol: 'tcp',
      //   domain: 'local.'
      // });
      
      this.initialized = true;
      console.log('✅ mDNS 设备发现初始化成功');
      
      // 设置设备发现监听
      this.setupListeners();
    } catch (error) {
      console.error('❌ mDNS 设备发现初始化失败:', error);
    }
  }

  /**
   * 设置监听
   */
  private setupListeners(): void {
    if (!this.zeroconf) return;

    // 发现设备
    this.zeroconf.onDeviceFound((device: any) => {
      console.log('发现设备:', device);
      this.discoveredDevices.set(device.id, device);
      if (this.deviceFoundCallback) {
        this.deviceFoundCallback(device);
      }
    });

    // 设备移除
    this.zeroconf.onDeviceRemoved((device: any) => {
      console.log('设备移除:', device);
      this.discoveredDevices.delete(device.id);
    });
  }

  /**
   * 开始扫描
   */
  async startScan(type: string = 'mimo'): Promise<void> {
    if (this.scanning) {
      console.log('正在扫描中...');
      return;
    }

    if (!this.initialized) {
      await this.initilize();
    }

    try {
      console.log(`开始 mDNS 扫描（类型: ${type})...`);
      this.scanning = true;

      if (this.zeroconf) {
        await this.zeroconf.scan(type);
      } else {
        // 模拟发现设备（开发测试用）
        console.log('模拟模式：模拟发现设备...');
        this.simulateDeviceDiscovery();
      }
    } catch (error) {
      console.error('扫描失败:', error);
      this.scanning = false;
    }
  }

  /**
   * 停止扫描
   */
  async stopScan(): Promise<void> {
    if (!this.scanning) return;

    try {
      console.log('停止 mDNS 扫描...');
      
      if (this.zeroconf) {
        await this.zeroconf.stop();
      }
      
      this.scanning = false;
      console.log('✅ 扫描已停止');
    } catch (error) {
      console.error('停止扫描失败:', error);
    }
  }

  /**
   * 模拟设备发现（开发测试用）
   */
  private simulateDeviceDiscovery(): void {
    // 模拟发现桌面端设备
    const mockDevices = [
      {
        id: 'desktop-001',
        name: '我的电脑',
        host: '192.168.1.100',
        port: 3001,
        type: 'desktop',
        platform: 'windows'
      },
      {
        id: 'desktop-002',
        name: '工作电脑',
        host: '192.168.1.101',
        port: 3001,
        type: 'desktop',
        platform: 'macos'
      }
    ];

    mockDevices.forEach((device, index) => {
      setTimeout(() => {
        console.log('模拟发现设备:', device.name);
        this.discoveredDevices.set(device.id, device);
        if (this.deviceFoundCallback) {
          this.deviceFoundCallback(device);
        }
      }, (index + 1) * 2000);
    });
  }

  /**
   * 设置设备发现回调
   */
  onDeviceFound(callback: (device: any) => void): void {
    this.deviceFoundCallback = callback;
  }

  /**
   * 获取已发现的设备
   */
  getDiscoveredDevices(): any[] {
    return Array.from(this.discoveredDevices.values());
  }

  /**
   * 清空发现的设备
   */
  clearDevices(): void {
    this.discoveredDevices.clear();
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    if (this.scanning) {
      this.stopScan();
    }
    
    // 移除监听
    // if (this.zeroconf) {
    //   this.zeroconf.removeListeners();
    // }
    
    this.discoveredDevices.clear();
    console.log('mDNS 发现服务已清理');
  }

  /**
   * 是否正在扫描
   */
  isScanning(): boolean {
    return this.scanning;
  }
}

export default MDNSDiscoveryService.getInstance();
