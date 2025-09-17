declare global {
	interface Window {
		electron: {
			showBackupSaveDialog: (options: {
				defaultPath?: string;
				filters?: Array<{
					name: string;
					extensions: string[];
				}>;
			}) => Promise<string | null>;
			showBackupOpenDialog: (options: {
				filters?: Array<{
					name: string;
					extensions: string[];
				}>;
			}) => Promise<string | null>;
			writeBackupFile: (
				filePath: string,
				content: string
			) => Promise<boolean>;
			readBackupFile: (filePath: string) => Promise<string>;
			directBackupToFile: (
				backupContent: string,
				filename?: string
			) => Promise<{ success: boolean; filePath: string }>;
			// 新增的类型定义
			listBackupFiles: () => Promise<
				Array<{
					name: string;
					path: string;
					size: number;
					createdAt: Date;
					modifiedAt: Date;
				}>
			>;
			deleteBackupFile: (
				filePath: string
			) => Promise<{ success: boolean }>;
			getIndexedDBSize: () => Promise<number>;
			// 在现有的ElectronAPI接口中添加
			compactIndexedDB: () => Promise<{
				success: boolean;
				message: string;
			}>;
			// 添加重启应用方法
			reload: () => Promise<void>;

			// 添加应用退出前事件监听方法
			onAppBeforeQuit: (callback: () => void) => () => void;
		};
		process?: {
			type?: string;
		};
	}
}

export {};
