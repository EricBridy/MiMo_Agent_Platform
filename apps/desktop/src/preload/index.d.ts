declare global {
    interface Window {
        mimoAPI: {
            device: {
                info: () => Promise<any>;
                list: () => Promise<any[]>;
                sendMessage: (deviceId: string, message: any) => Promise<void>;
            };
            agent: {
                status: () => Promise<any>;
                newChat: () => void;
                clearHistory: () => void;
            };
            file: {
                openDirectory: () => Promise<string | undefined>;
                read: (path: string) => Promise<string>;
                write: (path: string, content: string) => Promise<boolean>;
                listDir: (path: string) => Promise<any[]>;
            };
            terminal: {
                execute: (command: string, cwd?: string) => Promise<any>;
            };
            server: {
                url: () => Promise<string>;
            };
            on: (channel: string, callback: (...args: any[]) => void) => void;
            off: (channel: string, callback: (...args: any[]) => void) => void;
        };
    }
}
export {};
//# sourceMappingURL=index.d.ts.map