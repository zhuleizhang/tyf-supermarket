import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 定义配置接口
export interface ConfigState {
	// 多少分钟未操作后自动回到收银结算页面
	autoReturnToCheckoutMinutes: number;
	// 多少分钟未操作自动进入收银模式
	autoEnterCheckoutModeMinutes: number;
	// 每多少天自动备份一次数据
	autoBackupDays: number;
	// 设置自动返回收银页面的时间
	setAutoReturnToCheckoutMinutes: (minutes: number) => void;
	// 设置自动进入收银模式的时间
	setAutoEnterCheckoutModeMinutes: (minutes: number) => void;
	// 设置自动备份的天数
	setAutoBackupDays: (days: number) => void;
}

// 创建配置 store
export const useConfigStore = create<ConfigState>()(
	persist(
		(set) => ({
			// 默认值：5分钟未操作自动返回收银页面，10分钟未操作自动进入收银模式，1天自动备份一次
			autoReturnToCheckoutMinutes: 1,
			autoEnterCheckoutModeMinutes: 1,
			autoBackupDays: 1,

			// 设置自动返回收银页面的时间
			setAutoReturnToCheckoutMinutes: (minutes: number) => {
				set({ autoReturnToCheckoutMinutes: minutes });
			},

			// 设置自动进入收银模式的时间
			setAutoEnterCheckoutModeMinutes: (minutes: number) => {
				set({ autoEnterCheckoutModeMinutes: minutes });
			},

			// 设置自动备份的天数
			setAutoBackupDays: (days: number) => {
				set({ autoBackupDays: days });
			},
		}),
		{
			name: 'supermarket-config', // 本地存储的键名
		}
	)
);
