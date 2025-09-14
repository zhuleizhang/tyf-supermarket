const { contextBridge, ipcRenderer } = require('electron');

// 在渲染进程的window对象上暴露安全的API
contextBridge.exposeInMainWorld('electron', {
	// 显示备份文件保存对话框
	showBackupSaveDialog: async (options) => {
		try {
			return await ipcRenderer.invoke('showBackupSaveDialog', options);
		} catch (error) {
			console.error('调用显示保存对话框失败:', error);
			throw error;
		}
	},

	// 显示备份文件打开对话框
	showBackupOpenDialog: async (options) => {
		try {
			return await ipcRenderer.invoke('showBackupOpenDialog', options);
		} catch (error) {
			console.error('调用显示打开对话框失败:', error);
			throw error;
		}
	},

	// 写入备份文件
	writeBackupFile: async (filePath, content) => {
		try {
			return await ipcRenderer.invoke(
				'writeBackupFile',
				filePath,
				content
			);
		} catch (error) {
			console.error('调用写入文件失败:', error);
			throw error;
		}
	},

	// 读取备份文件
	readBackupFile: async (filePath) => {
		try {
			return await ipcRenderer.invoke('readBackupFile', filePath);
		} catch (error) {
			console.error('调用读取文件失败:', error);
			throw error;
		}
	},

	// 直接备份到指定目录，无需用户确认
	directBackupToFile: async (backupContent, filename) => {
		try {
			return await ipcRenderer.invoke(
				'directBackupToFile',
				backupContent,
				filename
			);
		} catch (error) {
			console.error('直接备份文件失败:', error);
			throw error;
		}
	},

	// 列出所有备份文件
	listBackupFiles: async () => {
		try {
			return await ipcRenderer.invoke('listBackupFiles');
		} catch (error) {
			console.error('列出备份文件失败:', error);
			throw error;
		}
	},

	// 删除指定的备份文件
	deleteBackupFile: async (filePath) => {
		try {
			return await ipcRenderer.invoke('deleteBackupFile', filePath);
		} catch (error) {
			console.error('删除备份文件失败:', error);
			throw error;
		}
	},
});

// 为TypeScript提供类型定义支持
// 注意：这个文件主要是为了提供运行时的API，类型定义在src/types/electron.d.ts中
