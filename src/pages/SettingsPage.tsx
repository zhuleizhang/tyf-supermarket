import React from 'react';
import DataBackupRestore from '../components/DataBackupRestore';
import { useConfigStore } from '../store/config-store';
import { InputNumber, message } from 'antd';

const SettingsPage: React.FC = () => {
	const {
		autoReturnToCheckoutMinutes,
		autoEnterCheckoutModeMinutes,
		autoBackupDays,
		setAutoReturnToCheckoutMinutes,
		setAutoEnterCheckoutModeMinutes,
		setAutoBackupDays,
	} = useConfigStore();

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

	return (
		<div className="min-h-screen bg-gray-50 p-6">
			<div className="max-w-4xl mx-auto">
				<h1 className="text-2xl font-bold text-gray-800 mb-6">
					系统设置
				</h1>

				{/* 数据备份恢复卡片 */}
				<div className="bg-white rounded-lg shadow-md p-6 mb-6">
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
					</div>
				</div>
			</div>
		</div>
	);
};

export default SettingsPage;
