/* eslint-disable @typescript-eslint/no-explicit-any */
import { categoryService, initDB } from '@/db';
import { message, Modal } from 'antd';
import { importDataFromFilePath } from '@/db/backupRestore';

export const bootstrap = async () => {
	initDB();

	(window as any).initCategory = async (data: string[]) => {
		if (!Array.isArray(data)) {
			data = [data];
		}
		for (const category of data) {
			// 检查分类是否已存在
			const existingCategory = await categoryService.getByName(category);
			if (!existingCategory) {
				const newCategory = await categoryService.add({
					name: category,
				});
				console.log(`创建分类: ${category}, ID: ${newCategory.id}`);
			} else {
				console.log(`分类 ${category} 已存在！`);
			}
		}
	};

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
