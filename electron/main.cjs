const { app, BrowserWindow, dialog, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// 导入package.json获取版本号
const packageJson = require(path.join(__dirname, '../package.json'));

const getNowTimeString = () =>
	new Date()
		.toLocaleString('zh-CN', {
			timeZone: 'Asia/Shanghai',
		})
		.replace(/[:/\s.]/g, '-');

// - macOS: ~/Library/Application Support/[应用名称]/
// - Windows: C:\Users\[用户名]\AppData\Roaming\[应用名称]\
// - Linux: ~/.config/[应用名称]/
// 创建自定义日志函数
const logToFile = (...logData) => {
	if (process.env.NODE_ENV === 'development') {
		console.log(logData);
	}

	try {
		// 获取应用的用户数据目录（跨平台标准路径）
		const userDataPath = app.getPath('userData');

		// 创建logs子目录
		const logsDir = path.join(userDataPath, 'logs');
		if (!fs.existsSync(logsDir)) {
			fs.mkdirSync(logsDir, { recursive: true });
		}

		// 生成日志文件名（包含日期）
		const date = new Date();
		const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1)
			.toString()
			.padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
		const logFile = path.join(logsDir, `app-${dateStr}.log`);

		const logDataStringify = logData.reduce((prev, cur) => {
			return prev + JSON.stringify(cur) + '\n';
		}, '');

		// 使用上海时间
		// 写入日志
		fs.appendFileSync(
			logFile,
			`${new Date().toLocaleString()}: ${logDataStringify}\n`
		);
	} catch (error) {
		// 如果写日志本身出错，不应该影响应用运行
		console.error('写入日志文件失败:', error);
	}
};

let mainWindow;

function createWindow() {
	// 创建浏览器窗口
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		minWidth: 1024,
		minHeight: 768,
		title: '小型超市商品价格管理系统',
		webPreferences: {
			preload: path.join(__dirname, 'preload.cjs'),
			nodeIntegration: false,
			contextIsolation: true,
			webSecurity: true,
		},
	});

	// 加载应用的index.html
	// const startUrl =
	// 	process.env.ELECTRON_START_URL ||
	// 	`${path.join(__dirname, './dist/index.html')}`;
	// mainWindow.loadURL(startUrl);

	// 加载应用
	// 在开发模式下加载开发服务器，在生产模式下加载本地HTML文件
	async function loadApplication() {
		try {
			if (process.env.NODE_ENV === 'development') {
				const devUrl = 'http://localhost:5173';
				logToFile(`[Electron] 正在开发模式下加载应用: ${devUrl}`);

				// 尝试加载开发服务器
				await mainWindow.loadURL(devUrl);
				logToFile('[Electron] 开发服务器加载成功');

				// 确保打开开发者工具
				mainWindow.webContents.openDevTools();
				logToFile('[Electron] 开发者工具已打开');
			} else {
				const filePath = path.join(__dirname, '../dist/index.html');
				logToFile(`[Electron] 正在生产模式下加载应用: ${filePath}`);
				await mainWindow.loadFile(filePath);
				logToFile('[Electron] 本地HTML文件加载成功');
			}
		} catch (error) {
			console.error('[Electron] 应用加载失败:', error);

			// 开发模式下的特殊错误处理
			if (process.env.NODE_ENV === 'development') {
				await dialog.showMessageBox(mainWindow, {
					type: 'error',
					title: '开发服务器错误',
					message: '无法连接到开发服务器!',
					detail:
						'请确保已运行 pnpm run dev 命令启动了Vite开发服务器。\n\n错误详情:\n' +
						error.message,
					buttons: ['确定'],
				});

				// 在开发服务器未启动时，可以选择加载一个临时HTML页面作为替代
				const errorHtml = `
					<!DOCTYPE html>
					<html>
					<head>
						<title>开发服务器错误</title>
						<style>
							body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f5f5f5; }
							h1 { color: #e74c3c; }
							p { color: #333; }
						</style>
					</head>
					<body>
						<h1>开发服务器未启动</h1>
						<p>请先运行 <strong>pnpm run dev</strong> 命令启动Vite开发服务器，然后重新加载应用。</p>
					</body>
					</html>
				`;
				await mainWindow.loadURL(
					`data:text/html;charset=utf-8,${encodeURIComponent(
						errorHtml
					)}`
				);
			} else {
				await dialog.showMessageBox(mainWindow, {
					type: 'error',
					title: '应用加载错误',
					message: '无法加载应用文件!',
					detail: error.message,
					buttons: ['确定'],
				});
				app.quit();
			}
		}
	}

	// 调用加载应用的函数
	loadApplication();

	// 打开开发工具（仅在开发模式下）
	// if (process.env.ELECTRON_START_URL) {
	// 	mainWindow.webContents.openDevTools();
	// }

	// 窗口关闭时触发
	mainWindow.on('closed', function () {
		mainWindow = null;
	});

	// 设置应用菜单
	createMenu();
}

// 创建应用菜单
function createMenu() {
	const template = [
		{
			label: '文件',
			submenu: [
				{
					label: '退出',
					accelerator: 'CmdOrCtrl+Q',
					click() {
						app.quit();
					},
				},
			],
		},
		{
			label: '编辑',
			submenu: [
				{ label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
				{
					label: '重做',
					accelerator: 'Shift+CmdOrCtrl+Z',
					role: 'redo',
				},
				{ type: 'separator' },
				{ label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
				{ label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
				{ label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
				{
					label: '全选',
					accelerator: 'CmdOrCtrl+A',
					role: 'selectAll',
				},
			],
		},
		{
			label: '查看',
			submenu: [
				{
					label: '刷新',
					accelerator: 'CmdOrCtrl+R',
					click() {
						mainWindow.reload();
					},
				},
				{
					label: '切换全屏',
					accelerator: 'F11',
					click() {
						mainWindow.setFullScreen(!mainWindow.isFullScreen());
					},
				},
				{
					label: '开发者工具',
					accelerator: 'CmdOrCtrl+Shift+I',
					click() {
						mainWindow.webContents.openDevTools();
					},
				},
			],
		},
		{
			label: '帮助',
			submenu: [
				{
					label: '关于',
					click() {
						dialog.showMessageBox(mainWindow, {
							title: '关于',
							message: `好客来超市管理系统\n版本: ${packageJson.version}`,
							buttons: ['确定'],
						});
					},
				},
			],
		},
	];

	const menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu);
}

// 监听应用准备就绪事件
app.whenReady().then(createWindow);

// 监听所有窗口关闭事件
app.on('window-all-closed', function () {
	// 在macOS上，除非用户用Cmd+Q显式退出，否则应用及其菜单栏通常会保持活动状态
	if (process.platform !== 'darwin') app.quit();
});

// 在macOS上，当点击dock图标并且没有其他窗口打开时，通常会在应用中重新创建一个窗口
app.on('activate', function () {
	if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC通信处理器

// 显示备份文件保存对话框
ipcMain.handle('showBackupSaveDialog', async (event, options) => {
	try {
		logToFile(options, 'showBackupSaveDialog options');
		const result = await dialog.showSaveDialog(mainWindow, options);
		return result.canceled ? null : result.filePath;
	} catch (error) {
		console.error('显示保存对话框失败:', error);
		throw error;
	}
});

// 显示备份文件打开对话框
ipcMain.handle('showBackupOpenDialog', async (event, options) => {
	try {
		const result = await dialog.showOpenDialog(mainWindow, {
			...options,
			properties: ['openFile'],
		});
		return result.canceled ? null : result.filePaths[0];
	} catch (error) {
		console.error('显示打开对话框失败:', error);
		throw error;
	}
});

// 写入备份文件
ipcMain.handle('writeBackupFile', async (event, filePath, content) => {
	try {
		fs.writeFileSync(filePath, content, 'utf8');
		return true;
	} catch (error) {
		console.error('写入文件失败:', error);
		throw error;
	}
});

// 读取备份文件
ipcMain.handle('readBackupFile', async (event, filePath) => {
	try {
		const content = fs.readFileSync(filePath, 'utf8');
		return content;
	} catch (error) {
		console.error('读取文件失败:', error);
		throw error;
	}
});

// 直接备份到指定目录，无需用户确认
ipcMain.handle('directBackupToFile', async (event, backupContent, filename) => {
	try {
		// 获取应用的用户数据目录
		const userDataPath = app.getPath('userData');

		// 创建backup子目录（如果不存在）
		const backupDir = path.join(userDataPath, 'backup');
		try {
			fs.mkdirSync(backupDir, { recursive: true });
		} catch (error) {
			// 目录已存在时忽略错误
			if (error.code !== 'EEXIST') {
				console.error('创建备份目录失败:', error);
				throw error;
			}
		}

		// 生成完整的文件路径
		const fileName =
			filename || `supermarket_backup_${getNowTimeString()}.json`;
		const filePath = path.join(backupDir, fileName);

		// 写入备份内容
		fs.writeFileSync(filePath, backupContent, 'utf8');
		logToFile(`[Electron] 数据已直接备份到: ${filePath}`);
		return { success: true, filePath };
	} catch (error) {
		console.error('直接备份文件失败:', error);
		throw error;
	}
});

// 列出备份目录中的所有备份文件
ipcMain.handle('listBackupFiles', async () => {
	try {
		// 获取应用的用户数据目录
		const userDataPath = app.getPath('userData');
		const backupDir = path.join(userDataPath, 'backup');

		// 检查备份目录是否存在
		if (!fs.existsSync(backupDir)) {
			return [];
		}

		// 读取目录内容
		const files = fs.readdirSync(backupDir);

		// 只返回JSON文件，并添加文件信息
		return (
			files
				.filter((file) => file.endsWith('.json'))
				.map((file) => {
					const filePath = path.join(backupDir, file);
					const stats = fs.statSync(filePath);
					return {
						name: file,
						path: filePath,
						size: stats.size,
						createdAt: stats.birthtime,
						modifiedAt: stats.mtime,
					};
				})
				// 按修改时间降序排列，最新的在前面
				.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime())
		);
	} catch (error) {
		console.error('列出备份文件失败:', error);
		throw error;
	}
});

// 删除指定的备份文件
ipcMain.handle('deleteBackupFile', async (event, filePath) => {
	try {
		// 获取应用的用户数据目录和备份目录路径
		const userDataPath = app.getPath('userData');
		const backupDir = path.join(userDataPath, 'backup');

		// 确保文件路径在备份目录内，防止恶意删除其他文件
		if (!filePath.startsWith(backupDir)) {
			throw new Error('无效的文件路径');
		}

		// 检查文件是否存在
		if (!fs.existsSync(filePath)) {
			throw new Error('文件不存在');
		}

		// 删除文件
		fs.unlinkSync(filePath);
		return { success: true };
	} catch (error) {
		console.error('删除备份文件失败:', error);
		throw error;
	}
});

// 处理获取IndexedDB大小的请求
ipcMain.handle('getIndexedDBSize', async () => {
	try {
		const userDataPath = app.getPath('userData');

		// IndexedDB文件通常存储在LevelDB文件夹中
		const dbPath = path.join(userDataPath, 'IndexedDB');

		// 如果目录不存在，返回0
		if (!fs.existsSync(dbPath)) {
			return 0;
		}

		// 计算目录大小的函数
		const getDirectorySize = (dirPath) => {
			let size = 0;
			const files = fs.readdirSync(dirPath);

			for (const file of files) {
				const filePath = path.join(dirPath, file);
				const stats = fs.statSync(filePath);

				if (stats.isDirectory()) {
					size += getDirectorySize(filePath);
				} else {
					size += stats.size;
				}
			}

			return size;
		};

		return getDirectorySize(dbPath);
	} catch (error) {
		logToFile('计算IndexedDB大小失败:', error);
		return 0;
	}
});

// 添加在现有IPC处理函数后面
// 修改compactIndexedDB处理函数，使用Windows专用的强力删除方案
ipcMain.handle('compactIndexedDB', async () => {
	try {
		const userDataPath = app.getPath('userData');
		const dbPath = path.join(userDataPath, 'IndexedDB');

		// 如果目录不存在，直接返回
		if (!fs.existsSync(dbPath)) {
			return { success: false, message: 'IndexedDB目录不存在' };
		}

		// Windows系统专用的终极强制删除函数
		const windowsUltimateDelete = (dirPath) => {
			return new Promise((resolve, reject) => {
				const { exec } = require('child_process');
				let command = '';

				if (process.platform === 'win32') {
					// 方案1: 使用Windows的DEL命令配合/F参数强制删除只读文件
					const deleteCommand1 = `cmd /c "cd /d \"${dirPath}\" && DEL /F /S /Q /A *.* 2>nul"`;

					// 方案2: 使用takeown获取所有权，icacls授予权限
					const deleteCommand2 = `cmd /c "takeown /f \"${dirPath}\" /r /d y && icacls \"${dirPath}\" /grant administrators:F /t /c /q"`;

					// 方案3: 使用PowerShell的Remove-Item命令，带有-Force和-Recurse参数
					const deleteCommand3 = `powershell -Command "Remove-Item -Path '${dirPath}' -Force -Recurse -ErrorAction SilentlyContinue"`;

					// 方案4: 最后再尝试重新创建目录
					const recreateCommand = `cmd /c "if not exist \"${dirPath}\" mkdir \"${dirPath}\""`;

					// 组合所有命令，用&&连接，一个失败就尝试下一个
					command = `${deleteCommand1} && ${deleteCommand3} || ${deleteCommand2} && ${deleteCommand3} && ${recreateCommand}`;
				} else {
					// macOS/Linux系统：使用rm -rf强制删除
					command = `rm -rf "${dirPath}"/* && rm -rf "${dirPath}/.*" 2>/dev/null || true`;
				}

				logToFile(`执行Windows终极删除命令: ${command}`);
				exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
					// 即使命令返回错误，我们也检查目录是否实际上被清空了
					try {
						const files = fs.readdirSync(dirPath);
						const isEmpty =
							files.length === 0 ||
							(files.length === 1 && files[0] === '.DS_Store'); // macOS特殊情况

						if (isEmpty) {
							logToFile('目录已成功清空，忽略命令错误');
							resolve();
						} else {
							logToFile(
								`目录未清空，剩余文件: ${files.join(', ')}`
							);
							if (error) {
								reject(error);
							} else {
								reject(new Error('命令执行成功但目录未清空'));
							}
						}
					} catch (checkError) {
						logToFile('检查目录状态失败:', checkError.message);
						if (error) {
							reject(error);
						} else {
							resolve();
						}
					}
				});
			});
		};

		logToFile('开始终极强制删除旧的IndexedDB文件...');
		await windowsUltimateDelete(dbPath);
		logToFile('旧的IndexedDB文件已终极强制删除');

		return { success: true, message: '数据库文件已终极强制删除成功' };
	} catch (error) {
		logToFile('数据库终极强制删除处理失败:', error);
		return {
			success: false,
			message:
				'数据库终极强制删除失败: ' + (error.message || String(error)),
		};
	}
});

// 在文件末尾添加重启应用的IPC处理函数
ipcMain.handle('reload', async () => {
	try {
		// 获取当前应用路径和参数
		const appPath = app.getPath('exe');
		const args = process.argv.slice(1);

		// 记录重启操作到日志
		logToFile('应用正在重启...');

		// 退出当前实例并重启应用
		app.relaunch({ args });
		app.exit(0);
	} catch (error) {
		logToFile('重启应用失败:', error);
		throw error;
	}
});
