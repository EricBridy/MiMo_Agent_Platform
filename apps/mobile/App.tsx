/**
 * MiMo Agent - React Native移动端应用入口
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  Modal,
  ScrollView
} from 'react-native';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 颜色主题
const COLORS = {
  primary: '#667eea',
  secondary: '#764ba2',
  background: '#f5f5f5',
  surface: '#ffffff',
  text: '#1a1a2e',
  textSecondary: '#666666',
  textMuted: '#999999',
  success: '#10b981',
  error: '#ef4444',
  border: 'rgba(0, 0, 0, 0.1)'
};

// 导入推送通知服务
let PushNotificationService: any = null;

// 动态导入推送服务（避免 JPush 未安装时报错）
try {
  // 实际使用时取消注释
  // PushNotificationService = require('./PushNotificationService').default;
  console.log('推送通知服务模块加载成功（当前为模拟模式）');
} catch (error) {
  console.log('推送通知服务未安装，使用模拟模式');
}

// 消息类型
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

// 设备类型
interface Device {
  id: string;
  name: string;
  platform: string;
  type: string;
  status: string;
}

// 主应用组件
const App: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDevices, setShowDevices] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'chat' | 'files' | 'commands' | 'status'>('chat');
  const [mobileFiles, setMobileFiles] = useState<any[]>([]);
  const [serverUrl, setServerUrl] = useState('http://localhost:3001');
  const [showSettings, setShowSettings] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);
  
  // 初始化连接
  useEffect(() => {
    // 初始化推送通知服务
    if (PushNotificationService) {
      PushNotificationService.initilize('YOUR_JPUSH_APP_KEY');
      console.log('推送通知服务已初始化');
    }
    
    loadServerUrl();
    return () => {
      socketRef.current?.disconnect();
      if (PushNotificationService) {
        PushNotificationService.cleanup();
      }
    };
  }, []);
  
  // 加载服务器URL
  const loadServerUrl = async () => {
    try {
      const url = await AsyncStorage.getItem('serverUrl');
      if (url) {
        setServerUrl(url);
        connectToServer(url);
      } else {
        setShowSettings(true);
      }
    } catch (error) {
      console.error('Failed to load server URL:', error);
    }
  };
  
  // 连接到服务器
  const connectToServer = (url: string) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    
    socketRef.current = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5
    });
    
    socketRef.current.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
      
      // 获取设备列表
      socketRef.current?.emit('device:list', (deviceList: Device[]) => {
        setDevices(deviceList);
      });
    });
    
    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });
    
    socketRef.current.on('device:discovered', (device: Device) => {
      setDevices(prev => {
        const exists = prev.find(d => d.id === device.id);
        if (exists) {
          return prev.map(d => d.id === device.id ? device : d);
        }
        return [...prev, device];
      });
    });
    
    socketRef.current.on('device:connected', (device: Device) => {
      setDevices(prev => prev.map(d => d.id === device.id ? device : d));
    });
    
    socketRef.current.on('message', (response: any) => {
      if (response.success && response.message) {
        setMessages(prev => [...prev, {
          ...response.message,
          id: response.message.id || Date.now().toString()
        }]);
      }
      setIsLoading(false);
    });
    
    socketRef.current.on('error', (error: any) => {
      Alert.alert('错误', error.message);
      setIsLoading(false);
    });
  };
  
  // 保存服务器URL
  const saveServerUrl = async () => {
    try {
      await AsyncStorage.setItem('serverUrl', serverUrl);
      setShowSettings(false);
      connectToServer(serverUrl);
    } catch (error) {
      Alert.alert('错误', '保存失败');
    }
  };
  
  // 发送消息
  const sendMessage = () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    socketRef.current?.emit('message', {
      sessionId: selectedDevice?.id || 'default',
      content: input.trim()
    });
  };
  
  // 唤醒设备
  const wakeDevice = async (device: Device) => {
    try {
      const response = await new Promise<any>((resolve, reject) => {
        socketRef.current?.emit('wake:request', {
          deviceId: device.id,
          sourceDevice: 'mobile',
          purpose: 'Quick coding task',
          priority: 'normal'
        }, (res: any) => {
          if (res.success) {
            resolve(res);
          } else {
            reject(new Error(res.error));
          }
        });
      });
      
      setSelectedDevice(device);
      setShowDevices(false);
      Alert.alert('成功', `已唤醒 ${device.name}`);
    } catch (error) {
      Alert.alert('唤醒失败', (error as Error).message);
    }
  };
  
  // 清空消息
  const clearMessages = () => {
    setMessages([]);
  };
  
  // 渲染消息
  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      item.role === 'user' && styles.userMessage
    ]}>
      <View style={[
        styles.messageBubble,
        item.role === 'user' && styles.userBubble,
        item.role === 'system' && styles.systemBubble
      ]}>
        <Text style={[
          styles.messageText,
          item.role === 'user' && styles.userMessageText
        ]}>
          {item.content}
        </Text>
        <Text style={styles.messageTime}>
          {item.timestamp.toLocaleTimeString()}
        </Text>
      </View>
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      
      {/* 顶部栏 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.logo}>🤖 MiMo</Text>
          <View style={[
            styles.statusDot,
            connected ? styles.connected : styles.disconnected
          ]} />
        </View>
        <TouchableOpacity 
          style={styles.deviceButton}
          onPress={() => setShowDevices(true)}
        >
          <Text style={styles.deviceButtonText}>
            📱 {selectedDevice?.name || '选择设备'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => setShowSettings(true)}
        >
          <Text>⚙️</Text>
        </TouchableOpacity>
      </View>
      
      {/* 消息列表 */}
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>开始对话</Text>
            <Text style={styles.emptyHint}>
              连接桌面端后即可开始编程任务
            </Text>
          </View>
        }
      />
      
      {/* 输入框 */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="输入消息..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity 
          style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!input.trim() || isLoading}
        >
          <Text style={styles.sendButtonText}>
            {isLoading ? '⏳' : '➤'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* 设备选择模态框 */}
      <Modal
        visible={showDevices}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDevices(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>选择设备</Text>
              <TouchableOpacity onPress={() => setShowDevices(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.deviceList}>
              {devices.length === 0 ? (
                <View style={styles.noDevices}>
                  <Text>未发现设备</Text>
                  <Text style={styles.hint}>
                    请确保桌面端应用正在运行
                  </Text>
                </View>
              ) : (
                devices.map(device => (
                  <TouchableOpacity
                    key={device.id}
                    style={[
                      styles.deviceItem,
                      selectedDevice?.id === device.id && styles.deviceItemSelected
                    ]}
                    onPress={() => wakeDevice(device)}
                  >
                    <Text style={styles.deviceIcon}>
                      {device.type === 'desktop' ? '🖥️' : '📱'}
                    </Text>
                    <View style={styles.deviceInfo}>
                      <Text style={styles.deviceName}>{device.name}</Text>
                      <Text style={styles.devicePlatform}>
                        {device.platform} • {device.status}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* 设置模态框 */}
      <Modal
        visible={showSettings}
        animationType="fade"
        transparent
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>设置</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingsForm}>
              <Text style={styles.label}>桌面端服务器地址</Text>
              <TextInput
                style={styles.settingsInput}
                value={serverUrl}
                onChangeText={setServerUrl}
                placeholder="http://192.168.x.x:3001"
                placeholderTextColor={COLORS.textMuted}
              />
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={saveServerUrl}
              >
                <Text style={styles.saveButtonText}>保存并连接</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  logo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8
  },
  connected: {
    backgroundColor: COLORS.success
  },
  disconnected: {
    backgroundColor: COLORS.error
  },
  deviceButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 16
  },
  deviceButtonText: {
    color: 'white',
    fontSize: 12
  },
  settingsButton: {
    padding: 8
  },
  messageList: {
    flex: 1
  },
  messageListContent: {
    padding: 16,
    flexGrow: 1
  },
  messageContainer: {
    marginBottom: 12,
    flexDirection: 'row'
  },
  userMessage: {
    justifyContent: 'flex-end'
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  userBubble: {
    backgroundColor: COLORS.primary
  },
  systemBubble: {
    backgroundColor: '#fff3cd'
  },
  messageText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 20
  },
  userMessageText: {
    color: 'white'
  },
  messageTime: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 4,
    alignSelf: 'flex-end'
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16
  },
  emptyText: {
    fontSize: 20,
    color: COLORS.text,
    marginBottom: 8
  },
  emptyHint: {
    fontSize: 14,
    color: COLORS.textSecondary
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: COLORS.text
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textMuted
  },
  sendButtonText: {
    color: 'white',
    fontSize: 20
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text
  },
  closeButton: {
    fontSize: 20,
    color: COLORS.textSecondary
  },
  deviceList: {
    padding: 16
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    marginBottom: 12
  },
  deviceItemSelected: {
    backgroundColor: COLORS.primary,
    opacity: 0.2
  },
  deviceIcon: {
    fontSize: 32,
    marginRight: 12
  },
  deviceInfo: {
    flex: 1
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text
  },
  devicePlatform: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  noDevices: {
    padding: 40,
    alignItems: 'center'
  },
  hint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 8
  },
  settingsForm: {
    padding: 20
  },
  label: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8
  },
  settingsInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: COLORS.text
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 20
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default App;
