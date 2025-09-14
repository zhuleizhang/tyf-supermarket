import { useEffect, useState } from 'react';
import { useConfigStore } from '../store/config-store';
import { message } from 'antd';
import { autoExportData, exportData } from '../db/backupRestore';

// 本地存储的键名
const LAST_BACKUP_TIME_KEY = 'supermarket-last-backup-time';

/**
 * 自动备份钩子
 * 实现定时备份功能，支持设置每多少天备份一次，更改后立即生效
 */
export const useAutoBackup = () => {
	const { autoBackupDays } = useConfigStore();
	const [lastBackupTime, setLastBackupTime] = useState<number | null>(null);

	// 执行备份操作
	const performBackup = async () => {
		try {
			if (window.electron) {
				await autoExportData();
			} else {
				// 调用exportData方法执行备份
				await exportData();
			}

			// 记录备份时间
			const currentTime = Date.now();
			localStorage.setItem(LAST_BACKUP_TIME_KEY, currentTime.toString());
			setLastBackupTime(currentTime);

			console.log('自动备份成功:', new Date().toLocaleString());
		} catch (error) {
			console.error('自动备份失败:', error);
			message.error('自动备份失败，请检查系统日志');
		}
	};

	// 检查是否需要执行备份
	const checkAndBackup = () => {
		if (autoBackupDays <= 0) {
			// 自动备份功能已禁用
			return;
		}

		const lastBackupTimeStr = localStorage.getItem(LAST_BACKUP_TIME_KEY);
		const currentTime = Date.now();
		const daysInMs = autoBackupDays * 24 * 60 * 60 * 1000;

		// 如果从未备份过或者已经超过了备份间隔时间，则执行备份
		if (
			!lastBackupTimeStr ||
			currentTime - parseInt(lastBackupTimeStr) >= daysInMs
		) {
			performBackup();
		}
	};

	// 初始化和配置变更时的处理
	useEffect(() => {
		// 初始化时获取上次备份时间
		const lastBackupTimeStr = localStorage.getItem(LAST_BACKUP_TIME_KEY);
		if (lastBackupTimeStr) {
			setLastBackupTime(parseInt(lastBackupTimeStr));
		}

		// 立即检查是否需要备份
		checkAndBackup();

		// 设置定时检查（每小时检查一次）
		const intervalId = setInterval(checkAndBackup, 60 * 60 * 1000);

		// 清理定时器
		return () => {
			clearInterval(intervalId);
		};
	}, [autoBackupDays]);

	// 手动触发备份的函数（供外部调用）
	const triggerBackup = performBackup;

	// 获取上次备份时间的可读格式
	const getLastBackupTimeFormatted = () => {
		if (!lastBackupTime) {
			return '从未备份';
		}
		return new Date(lastBackupTime).toLocaleString();
	};

	// 获取下一次备份时间的可读格式
	const getNextBackupTimeFormatted = () => {
		if (autoBackupDays <= 0 || !lastBackupTime) {
			return '未设置';
		}
		const nextBackupTime =
			lastBackupTime + autoBackupDays * 24 * 60 * 60 * 1000;
		return new Date(nextBackupTime).toLocaleString();
	};

	return {
		triggerBackup,
		lastBackupTime,
		getLastBackupTimeFormatted,
		getNextBackupTimeFormatted,
	};
};

// 默认导出钩子

export default useAutoBackup;
