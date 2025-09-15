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
		};
		process?: {
			type?: string;
		};
	}
}

export {};
