import React, { useState, useEffect } from 'react';
import DataBackupRestore from '../components/DataBackupRestore';
import BulkProductCreate from '../components/BulkProductCreate';
import { useConfigStore } from '../store/config-store';
import { InputNumber, message, Spin } from 'antd';
import Page from '@/components/Page';

const SettingsPage: React.FC = () => {
	const {
		autoReturnToCheckoutMinutes,
		autoEnterCheckoutModeMinutes,
		autoBackupDays,
		topSellingProductsCount,
		setAutoReturnToCheckoutMinutes,
		setAutoEnterCheckoutModeMinutes,
		setAutoBackupDays,
		setTopSellingProductsCount,
	} = useConfigStore();

	// 存储空间信息状态
	const [storageInfo, setStorageInfo] = useState<{
		quota?: number; // 总空间
		usage?: number; // 已用空间
		usageDetails?: { indexedDB?: number }; // 各存储类型的使用情况
	}>({});
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	// 处理自动返回收银页面时间的变化
	const handleAutoReturnChange = (value: number) => {
		if (value >= 0) {
			setAutoReturnToCheckoutMinutes(value);
			message.success('自动返回收银页面时间已更新');
		}
	};

	// 处理自动进入收银模式时间的变化
	const handleAutoEnterModeChange = (value: number) => {
		if (value >= 0) {
			setAutoEnterCheckoutModeMinutes(value);
			message.success('自动进入收银模式时间已更新');
		}
	};

	// 处理自动备份天数的变化
	const handleAutoBackupChange = (value: number) => {
		if (value >= 0) {
			setAutoBackupDays(value);
			message.success('自动备份间隔已更新');
		}
	};

	// 处理销售排行商品数量的变化
	const handleTopSellingProductsChange = (value: number) => {
		if (value >= 1) {
			setTopSellingProductsCount(value);
			message.success('销售排行商品数量已更新');
		}
	};

	// 格式化字节大小为可读格式
	const formatBytes = (bytes: number, decimals: number = 2): string => {
		if (bytes === 0) return '0 Bytes';

		const k = 1024;
		const dm = decimals < 0 ? 0 : decimals;
		const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

		const i = Math.floor(Math.log(bytes) / Math.log(k));

		return (
			parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
		);
	};

	// 获取存储空间信息
	const getStorageInfo = async () => {
		setLoading(true);
		setError(null);
		try {
			// 检查浏览器是否支持StorageManager API
			if ('storage' in navigator && 'estimate' in navigator.storage) {
				const estimate = await navigator.storage.estimate();
				setStorageInfo(estimate);
			} else {
				setError('您的浏览器不支持查看存储空间信息');
			}
		} catch (err) {
			console.error('获取存储空间信息失败:', err);
			setError('获取存储空间信息失败');
		} finally {
			setLoading(false);
		}
	};

	// 组件加载时获取存储空间信息
	useEffect(() => {
		getStorageInfo();
	}, []);

	return (
		<Page>
			<div className="max-w-4xl mx-auto flex flex-col gap-6">
				<h1 className="text-2xl font-bold text-gray-800">系统设置</h1>

				{/* 数据备份恢复卡片 */}
				<div className="bg-white rounded-lg shadow-md p-6">
					<h2 className="text-xl font-semibold text-gray-700 mb-4">
						数据备份与恢复
					</h2>
					<DataBackupRestore />
				</div>

				{/* 全局配置卡片 */}
				<div className="bg-white rounded-lg shadow-md p-6">
					<h2 className="text-xl font-semibold text-gray-700 mb-4">
						全局配置
					</h2>

					<div className="space-y-4">
						{/* 自动返回收银页面设置 */}
						<div className="flex flex-col space-y-2">
							<label
								htmlFor="autoReturnToCheckout"
								className="text-gray-700 font-medium"
							>
								多少分钟未操作后自动回到收银结算页面
							</label>
							<div className="flex items-center space-x-3">
								<InputNumber
									id="autoReturnToCheckout"
									type="number"
									min={0}
									value={autoReturnToCheckoutMinutes}
									onChange={handleAutoReturnChange}
								/>
								<span className="text-gray-600">分钟</span>
							</div>
							<p className="text-gray-500 text-sm">
								设置为0表示禁用此功能
							</p>
						</div>

						{/* 自动进入收银模式设置 */}
						<div className="flex flex-col space-y-2">
							<label
								htmlFor="autoEnterCheckoutMode"
								className="text-gray-700 font-medium"
							>
								多少分钟未操作自动进入收银模式
							</label>
							<div className="flex items-center space-x-3">
								<InputNumber
									id="autoEnterCheckoutMode"
									type="number"
									min={0}
									value={autoEnterCheckoutModeMinutes}
									onChange={handleAutoEnterModeChange}
								/>
								<span className="text-gray-600">分钟</span>
							</div>
							<p className="text-gray-500 text-sm">
								设置为0表示禁用此功能
							</p>
						</div>

						{/* 自动备份设置 */}
						<div className="flex flex-col space-y-2">
							<label
								id="autoBackup"
								className="text-gray-700 font-medium"
							>
								每多少天自动备份一次数据
							</label>
							<div className="flex items-center space-x-3">
								<InputNumber
									id="autoBackup"
									type="number"
									min={0}
									value={autoBackupDays}
									onChange={handleAutoBackupChange}
								/>
								<span className="text-gray-600">天</span>
							</div>
							<p className="text-gray-500 text-sm">
								设置为0表示禁用此功能，默认1天备份一次
							</p>
						</div>

						{/* 销售排行商品数量设置 */}
						<div className="flex flex-col space-y-2">
							<label
								id="topSellingProductsCount"
								className="text-gray-700 font-medium"
							>
								商品销售排行显示的商品数量
							</label>
							<div className="flex items-center space-x-3">
								<InputNumber
									id="topSellingProductsCount"
									type="number"
									min={1}
									value={topSellingProductsCount}
									onChange={handleTopSellingProductsChange}
								/>
								<span className="text-gray-600">个</span>
							</div>
							<p className="text-gray-500 text-sm">
								设置销售排行显示的商品数量，至少为1个，默认10个
							</p>
						</div>
					</div>
				</div>

				{/* 批量创建商品卡片 */}
				<div className="bg-white rounded-lg shadow-md p-6">
					<h2 className="text-xl font-semibold text-gray-700 mb-4">
						批量创建商品
					</h2>
					<BulkProductCreate />
				</div>

				{/* 存储空间信息卡片 */}
				<div className="bg-white rounded-lg shadow-md p-6">
					<h2 className="text-xl font-semibold text-gray-700 mb-4">
						存储空间信息
					</h2>
					{loading ? (
						<div className="flex justify-center items-center py-4">
							<Spin tip="正在获取存储空间信息..." />
						</div>
					) : error ? (
						<div className="text-red-500 py-4">{error}</div>
					) : (
						<div className="space-y-4">
							<div className="flex flex-col space-y-2">
								<label className="text-gray-700 font-medium">
									IndexedDB 已用空间
								</label>
								<div className="text-xl font-semibold">
									{storageInfo.usageDetails?.indexedDB
										? formatBytes(
												storageInfo.usageDetails
													.indexedDB
											)
										: '无法获取'}
								</div>
							</div>

							<div className="flex flex-col space-y-2">
								<label className="text-gray-700 font-medium">
									应用总已用空间
								</label>
								<div className="text-xl font-semibold">
									{storageInfo.usage
										? formatBytes(storageInfo.usage)
										: '无法获取'}
								</div>
							</div>

							<div className="flex flex-col space-y-2">
								<label className="text-gray-700 font-medium">
									可用总空间配额
								</label>
								<div className="text-xl font-semibold">
									{storageInfo.quota
										? formatBytes(storageInfo.quota)
										: '无法获取'}
								</div>
							</div>

							{storageInfo.quota && storageInfo.usage && (
								<div className="flex flex-col space-y-2">
									<label className="text-gray-700 font-medium">
										已使用百分比
									</label>
									<div className="w-full bg-gray-200 rounded-full h-4">
										<div
											className="bg-blue-500 h-4 rounded-full"
											style={{
												width: `${(storageInfo.usage / storageInfo.quota) * 100}%`,
											}}
										></div>
									</div>
									<div className="text-right text-sm text-gray-500">
										{(
											(storageInfo.usage /
												storageInfo.quota) *
											100
										).toFixed(2)}
										%
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</Page>
	);
};

export default SettingsPage;
