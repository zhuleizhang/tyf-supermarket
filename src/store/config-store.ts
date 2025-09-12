import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 定义配置接口
export interface ConfigState {
	// 多少分钟未操作后自动回到收银结算页面
	autoReturnToCheckoutMinutes: number;
	// 多少分钟未操作自动进入收银模式
	autoEnterCheckoutModeMinutes: number;
	// 设置自动返回收银页面的时间
	setAutoReturnToCheckoutMinutes: (minutes: number) => void;
	// 设置自动进入收银模式的时间
	setAutoEnterCheckoutModeMinutes: (minutes: number) => void;
}

// 创建配置 store
export const useConfigStore = create<ConfigState>()(
	persist(
		(set) => ({
			// 默认值：5分钟未操作自动返回收银页面，10分钟未操作自动进入收银模式
			autoReturnToCheckoutMinutes: 1,
			autoEnterCheckoutModeMinutes: 1,

			// 设置自动返回收银页面的时间
			setAutoReturnToCheckoutMinutes: (minutes: number) => {
				set({ autoReturnToCheckoutMinutes: minutes });
			},

			// 设置自动进入收银模式的时间
			setAutoEnterCheckoutModeMinutes: (minutes: number) => {
				set({ autoEnterCheckoutModeMinutes: minutes });
			},
		}),
		{
			name: 'supermarket-config', // 本地存储的键名
		}
	)
);
