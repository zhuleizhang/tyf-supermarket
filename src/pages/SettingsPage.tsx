import React, { useState, useEffect } from 'react';
import DataBackupRestore from '../components/DataBackupRestore';
import BulkProductCreate from '../components/BulkProductCreate';
import { useConfigStore } from '../store/config-store';
import {
	InputNumber,
	message,
	Spin,
	Progress,
	Modal,
	Button,
	Input,
} from 'antd';
import { LockOutlined } from '@ant-design/icons';
import Page from '@/components/Page';
import { orderService, dbUtils, autoExportData } from '../db';
import { DeleteOutlined } from '@ant-design/icons';
import { useCartStore } from '@/store';

const MinFailedAttempts = 5;

const SettingsPage: React.FC = () => {
	const [newPassword, setNewPassword] = useState<string>('');
	const [confirmPassword, setConfirmPassword] = useState<string>('');
	const [passwordInputKey, setPasswordInputKey] = useState<number>(0);

	// 在组件的解构中添加maxFailedAttempts和setMaxFailedAttempts
	const {
		autoReturnToCheckoutMinutes,
		autoEnterCheckoutModeMinutes,
		autoBackupDays,
		topSellingProductsCount,
		loginPassword,
		autoLockMinutes,
		maxFailedAttempts,
		setAutoReturnToCheckoutMinutes,
		setAutoEnterCheckoutModeMinutes,
		setAutoBackupDays,
		setTopSellingProductsCount,
		setLoginPassword,
		setAutoLockMinutes,
		setMaxFailedAttempts,
	} = useConfigStore();

	const clearCart = useCartStore((s) => s.clearCart);

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

	// 处理开机密码设置
	const handlePasswordSubmit = () => {
		if (newPassword !== confirmPassword) {
			message.error('两次输入的密码不一致');
			return;
		}

		setLoginPassword(newPassword);
		message.success('开机密码已更新');

		// 重置输入框
		setNewPassword('');
		setConfirmPassword('');
		setPasswordInputKey((prev) => prev + 1);
	};

	// 处理自动锁定时间变化
	const handleAutoLockChange = (value: number) => {
		if (value >= 0) {
			setAutoLockMinutes(value);
			message.success('自动锁定时间已更新');
		}
	};

	// 清除密码
	const handleClearPassword = () => {
		Modal.confirm({
			title: '清除密码确认',
			content: '确定要清除开机密码吗？清除后系统将不再自动锁定。',
			okText: '确定清除',
			cancelText: '取消',
			onOk: () => {
				setLoginPassword('');
				setNewPassword('');
				setConfirmPassword('');
				setPasswordInputKey((prev) => prev + 1);
				message.success('开机密码已清除');
			},
		});
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

				// 使用Electron的IPC获取实际的IndexedDB大小
				if (window.electron) {
					const indexedDBSize =
						await window.electron.getIndexedDBSize();

					setStorageInfo((prev) => ({
						...prev,
						usage: indexedDBSize,
						usageDetails: { indexedDB: indexedDBSize },
					}));
				}
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

	// 处理删除一年前订单数据
	const handleDeleteOldOrders = () => {
		// 计算存储空间使用百分比
		const usagePercentage =
			storageInfo.quota && storageInfo.usage
				? (storageInfo.usage / storageInfo.quota) * 100
				: 0;

		// 根据存储使用情况决定提示信息
		let confirmMessage =
			'此操作将删除所有超过一年的订单数据，该操作不可恢复。确定要继续吗？';

		if (usagePercentage < 50) {
			confirmMessage =
				'当前存储空间使用情况健康，仅使用了' +
				usagePercentage.toFixed(2) +
				'%的空间。您确定要删除一年前的订单数据吗？';
		}

		Modal.confirm({
			title: '删除确认',
			content: confirmMessage,
			okText: '确定删除',
			cancelText: '取消',
			okType: 'danger',
			onOk: async () => {
				try {
					// 显示加载中
					message.loading('正在删除旧订单数据...', 0);

					// 执行删除操作
					const result = await orderService.deleteOldOrders();

					// 关闭加载提示
					message.destroy();

					if (result.success) {
						if (result.count > 0) {
							message.success(
								`成功删除了${result.count}条一年前的订单数据`
							);
							// 刷新存储空间信息
							getStorageInfo();
						} else {
							message.info('没有找到一年前的订单数据');
						}
					} else {
						message.error('删除订单数据失败');
					}
				} catch (error) {
					console.error('删除旧订单时出错:', error);
					message.error('删除订单数据时发生错误');
				}
			},
		});
	};

	const compactDatabaseConfirm = async () => {
		try {
			// 先自动导出备份文件作为安全措施
			const backupResult = await autoExportData();
			if (!backupResult || !backupResult.success) {
				// 如果备份失败，询问用户是否继续
				Modal.confirm({
					title: '备份失败',
					content:
						'数据备份创建失败，继续压缩可能导致数据丢失。是否仍要继续？',
					okText: '继续',
					cancelText: '取消',
					onOk: () => executeCompactDatabase(),
				});
				return;
			}

			// 备份成功，继续执行压缩
			await executeCompactDatabase(backupResult.filePath);
		} catch (error) {
			console.error('压缩数据库时出错:', error);
			message.error('压缩数据库时发生错误');
		}
	};

	// 执行数据库压缩的核心逻辑
	const executeCompactDatabase = async (backupFilePath?: string) => {
		try {
			// 显示加载中
			message.loading('正在压缩数据库...', 0);

			clearCart();
			// 执行压缩操作
			const success = await dbUtils.compactIndexedDB();

			// 关闭加载提示
			message.destroy();

			if (success) {
				// 将备份路径保存到localStorage，用于应用重启后恢复
				if (backupFilePath) {
					localStorage.setItem('pendingRestore', backupFilePath);
				}
				const timeout = 3;
				message.info(`${timeout}秒后自动重启应用`);
				setTimeout(() => {
					window.electron.reload();
				}, timeout * 1000);

				// 询问用户是否立即重启应用
				// Modal.confirm({
				// 	title: '数据库压缩成功',
				// 	content: '压缩已完成，建议重启应用以恢复数据。现在重启吗？',
				// 	okText: '立即重启',
				// 	cancelText: '稍后重启',
				// 	onOk: () => {
				// 		// 如果在Electron环境中，可以调用重启方法
				// 		if (window.electron) {
				// 			// 通知主进程重启应用
				// 			// 注意：需要在electron中实现这个方法
				// 			window.electron.reload();
				// 		} else {
				// 			// 浏览器环境直接刷新页面
				// 			window.location.reload();
				// 		}
				// 	},
				// 	onCancel: () => {
				// 		message.info('请在方便时手动重启应用');
				// 		// 刷新存储空间信息
				// 		getStorageInfo();
				// 	},
				// });
			} else {
				message.error('数据库压缩失败');
			}
		} catch (error) {
			console.error('压缩数据库时出错:', error);
			message.error('压缩数据库时发生错误');
		}
	};

	// 处理数据库压缩
	const handleCompactDatabase = () => {
		Modal.confirm({
			title: '数据库压缩确认',
			content:
				'此操作将压缩数据库以释放未使用空间，操作成功后会自动重启，操作过程中请勿关闭应用。确定要继续吗？',
			okText: '确定压缩',
			cancelText: '取消',
			onOk: compactDatabaseConfirm,
		});
	};

	// 处理最大失败尝试次数变化
	const handleMaxFailedAttemptsChange = (value: number) => {
		if (value >= MinFailedAttempts) {
			// 设置最小值为3次，避免用户设置过低导致体验不佳
			setMaxFailedAttempts(value);
			message.success('最大密码失败尝试次数已更新');
		} else {
			message.warning(`最大失败尝试次数不能少于${MinFailedAttempts}次`);
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

						{/* 开机密码设置 */}
						<div className="flex flex-col space-y-3">
							<div className="flex justify-between items-center">
								<label
									className="text-gray-700 font-medium"
									id="loginPassword"
								>
									开机密码
								</label>
								{loginPassword && (
									<Button
										danger
										size="small"
										onClick={handleClearPassword}
									>
										清除密码
									</Button>
								)}
							</div>
							<div className="space-y-3">
								<Input.Password
									key={passwordInputKey}
									prefix={<LockOutlined />}
									placeholder={
										loginPassword
											? '当前已设置密码，请输入新密码或保持为空'
											: '请设置开机密码'
									}
									value={newPassword}
									onChange={(e) =>
										setNewPassword(e.target.value)
									}
									visibilityToggle
									autoComplete="new-password"
								/>
								<Input.Password
									prefix={<LockOutlined />}
									placeholder="请确认密码"
									value={confirmPassword}
									onChange={(e) =>
										setConfirmPassword(e.target.value)
									}
									visibilityToggle
									autoComplete="new-password"
								/>
								<Button
									type="primary"
									onClick={handlePasswordSubmit}
									className="w-full"
								>
									{loginPassword ? '修改密码' : '设置密码'}
								</Button>
							</div>
							<p className="text-gray-500 text-sm">
								设置为空表示不使用密码锁定功能
							</p>
						</div>

						{/* 自动锁定时间设置 */}
						{loginPassword && (
							<div className="flex flex-col space-y-2">
								<label
									className="text-gray-700 font-medium"
									id="autoLockMinutes"
								>
									无操作后自动锁定时间
								</label>
								<div className="flex items-center space-x-3">
									<InputNumber
										id="autoLockMinutes"
										type="number"
										min={0}
										value={autoLockMinutes}
										onChange={handleAutoLockChange}
									/>
									<span className="text-gray-600">分钟</span>
								</div>
								<p className="text-gray-500 text-sm">
									设置为0表示禁用自动锁定功能，默认5分钟
								</p>
							</div>
						)}
						{/* 在自动锁定时间设置后添加最大失败尝试次数设置 */}
						<div className="flex flex-col space-y-2">
							<label
								className="text-gray-700 font-medium"
								id="autoLockMinutes"
							>
								最大密码失败尝试次数
							</label>
							<div className="flex items-center space-x-3">
								<InputNumber
									min={MinFailedAttempts}
									max={20}
									value={maxFailedAttempts}
									onChange={handleMaxFailedAttemptsChange}
								/>
								<span className="text-gray-600">次</span>
							</div>
							<p className="text-gray-500 mb-2">
								超过此次数后，系统将5分钟不允许输入密码
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
							<Spin />
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

							{Boolean(
								storageInfo.quota && storageInfo.usage
							) && (
								<div className="flex flex-col space-y-2">
									<label className="text-gray-700 font-medium">
										已使用百分比
									</label>
									<Progress
										percent={parseFloat(
											(
												(storageInfo.usage /
													storageInfo.quota) *
												100
											).toFixed(2)
										)}
										size="small"
										status={
											parseFloat(
												(
													(storageInfo.usage /
														storageInfo.quota) *
													100
												).toFixed(2)
											) > 80
												? 'exception'
												: 'normal'
										}
										strokeColor={{
											'0%': '#108ee9',
											'100%': '#ff4d4f',
										}}
									/>
								</div>
							)}
							{/* 添加删除一年前订单数据的按钮 */}
							<div className="mt-4 pt-4 border-t border-gray-200">
								<div className="flex flex-wrap gap-2">
									<Button
										type="primary"
										danger
										icon={<DeleteOutlined />}
										onClick={handleDeleteOldOrders}
									>
										删除一年前的订单数据
									</Button>

									<Button
										type="primary"
										onClick={handleCompactDatabase}
									>
										压缩数据库文件体积
									</Button>
								</div>
								<p className="text-gray-500 text-sm mt-2">
									删除一年前的订单数据可以释放存储空间，但删除后数据将无法恢复
								</p>
								<p className="text-gray-500 text-sm mt-2">
									压缩数据库可以释放已删除数据占用的空间
								</p>
							</div>
						</div>
					)}
				</div>
			</div>
		</Page>
	);
};

export default SettingsPage;
