/* eslint-disable @typescript-eslint/no-unused-vars */
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
	// 商品销售排行显示的商品数量
	topSellingProductsCount: number;
	// 设置自动返回收银页面的时间
	setAutoReturnToCheckoutMinutes: (minutes: number) => void;
	// 设置自动进入收银模式的时间
	setAutoEnterCheckoutModeMinutes: (minutes: number) => void;
	// 设置自动备份的天数
	setAutoBackupDays: (days: number) => void;
	// 设置商品销售排行显示的商品数量
	setTopSellingProductsCount: (count: number) => void;
	// 开机密码（加密存储）
	loginPassword: string;
	// 设置开机密码
	setLoginPassword: (password: string) => void;
	// 无操作后自动锁定时间（分钟）
	autoLockMinutes: number;
	// 设置自动锁定时间
	setAutoLockMinutes: (minutes: number) => void;
	// 密码失败尝试次数
	failedAttempts: number;
	// 增加失败尝试次数
	incrementFailedAttempts: () => void;
	// 重置失败尝试次数
	resetFailedAttempts: () => void;
	// 是否应该在锁屏页面
	shouldInLockPage: boolean;
	// 是否应该在锁屏页面
	setShouldInLockPage: (b: boolean) => void;
}

// 简单的加密函数
export const encryptPassword = (password: string): string => {
	return btoa(password); // 使用Base64编码作为简单加密
};

// 简单的解密函数
export const decryptPassword = (encryptedPassword: string): string => {
	try {
		return atob(encryptedPassword);
	} catch (error) {
		return '';
	}
};

// 创建配置 store
export const useConfigStore = create<ConfigState>()(
	persist(
		(set) => ({
			// 默认值：5分钟未操作自动返回收银页面，10分钟未操作自动进入收银模式，1天自动备份一次
			autoReturnToCheckoutMinutes: 1,
			autoEnterCheckoutModeMinutes: 1,
			autoBackupDays: 1,
			// 商品销售排行显示的商品数量，默认10个
			topSellingProductsCount: 10,

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

			// 设置商品销售排行显示的商品数量
			setTopSellingProductsCount: (count: number) => {
				set({ topSellingProductsCount: count });
			},

			// 开机密码相关
			loginPassword: '',
			setLoginPassword: (password: string) =>
				set({
					loginPassword: password ? encryptPassword(password) : '',
				}),
			autoLockMinutes: 5,
			setAutoLockMinutes: (minutes: number) =>
				set({ autoLockMinutes: minutes }),
			failedAttempts: 0,
			incrementFailedAttempts: () =>
				set((state) => ({ failedAttempts: state.failedAttempts + 1 })),
			resetFailedAttempts: () => set({ failedAttempts: 0 }),
			shouldInLockPage: false,
			setShouldInLockPage: (b: boolean) =>
				set({
					shouldInLockPage: Boolean(b),
				}),
		}),
		{
			name: 'supermarket-config', // 本地存储的键名
		}
	)
);
