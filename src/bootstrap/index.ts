import { initDB } from '@/db';
import { message, Modal } from 'antd';
import { importDataFromFilePath } from '@/db/backupRestore';

export const bootstrap = async () => {
	initDB();

	// 检查是否有待恢复的备份
	const pendingRestorePath = localStorage.getItem('pendingRestore');
	if (pendingRestorePath) {
		try {
			Modal.confirm({
				title: '恢复数据',
				content: `检测到上次压缩后的数据备份，是否要从备份文件恢复数据？`,
				okText: '恢复',
				cancelText: '忽略',
				onOk: async () => {
					try {
						// 显示加载中
						message.loading('正在恢复数据...', 0);
						importDataFromFilePath(pendingRestorePath);
						message.destroy();
						message.success('数据恢复成功，即将自动刷新页面');
						// 清除标记，防止重复恢复
						localStorage.removeItem('pendingRestore');
						setTimeout(() => {
							window.location.reload();
						}, 1000);
					} catch (error) {
						console.error('恢复数据失败:', error);
						message.destroy();
						message.error('恢复数据失败');
					}
				},
			});
		} catch (error) {
			console.error('检查备份恢复失败:', error);
		}
	}
};
