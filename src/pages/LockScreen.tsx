import React, { useEffect, useRef, useState } from 'react';
import {
	Alert,
	Avatar,
	Button,
	Form,
	Input,
	message,
	notification,
} from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useConfigStore, decryptPassword } from '../store/config-store';
import type { InputRef } from 'antd';
import Logo from '@/assets/website.png';

/**
 * 锁定页面组件
 * 用于验证用户输入的密码并解锁系统
 */
const LockScreen: React.FC = () => {
	const [form] = Form.useForm();
	const [password, setPassword] = useState<string>('');
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [remainingTime, setRemainingTime] = useState<number>(0);
	const passwordInputRef = useRef<InputRef>(null);
	const timerRef = useRef<NodeJS.Timeout | null>(null);

	const {
		loginPassword,
		failedAttempts,
		maxFailedAttempts,
		incrementFailedAttempts,
		resetFailedAttempts,
		setShouldInLockPage,
		isInputLockedOut,
		lockoutEndTime,
		setLockoutEndTime,
	} = useConfigStore();

	console.log(lockoutEndTime, isInputLockedOut());

	// 自动聚焦密码输入框（如果未锁定）
	useEffect(() => {
		if (passwordInputRef.current && !isInputLockedOut()) {
			passwordInputRef.current.focus();
		}
	}, [isInputLockedOut]);

	const startLockoutCountdown = (endTime: number) => {
		// 计算剩余时间（秒）
		const updateRemainingTime = () => {
			const remaining = Math.ceil((endTime - Date.now()) / 1000);
			console.log(remaining, endTime, Date.now(), 'remaining');

			if (remaining <= 0) {
				// 锁定时间结束
				setRemainingTime(0);
				setLockoutEndTime(null);
				resetFailedAttempts();
				if (timerRef.current) {
					clearInterval(timerRef.current);
					timerRef.current = null;
				}
				// 重新聚焦密码输入框
				if (passwordInputRef.current) {
					passwordInputRef.current.focus();
				}
			} else {
				setRemainingTime(remaining);
			}
		};

		// 初始更新
		updateRemainingTime();

		// 设置定时器每秒更新剩余时间
		timerRef.current = setInterval(updateRemainingTime, 1000);
	};

	// 处理锁定倒计时
	useEffect(() => {
		// 检查是否处于锁定状态
		if (isInputLockedOut() && lockoutEndTime) {
			startLockoutCountdown(lockoutEndTime);
			return () => {
				if (timerRef.current) {
					clearInterval(timerRef.current);
				}
			};
		} else {
			setLockoutEndTime(null);
			resetFailedAttempts();
		}
	}, []);

	// 处理密码输入变化
	const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setPassword(e.target.value);
	};

	// 处理密码验证提交
	const handleSubmit = async (values: { password: string }) => {
		setIsSubmitting(true);
		try {
			const decryptedPassword = loginPassword
				? decryptPassword(loginPassword)
				: '';
			const inputPassword = values.password;

			if (inputPassword === decryptedPassword) {
				// 密码正确，解锁系统
				// 显示失败尝试次数通知（如果有）
				if (failedAttempts > 0) {
					notification.warning({
						message: '系统解锁成功',
						description: `锁屏期间有 ${failedAttempts} 次密码输入失败尝试。`,
						duration: 10,
						showProgress: true,
					});
					// 重置失败尝试次数
					resetFailedAttempts();
				}
				setShouldInLockPage(false);
				// 重定向到首页或上次访问的页面
			} else {
				// 密码错误，增加失败尝试次数
				incrementFailedAttempts();

				// 检查是否达到最大失败次数
				const currentAttempts = failedAttempts + 1; // 因为state更新是异步的，所以+1
				if (currentAttempts >= maxFailedAttempts) {
					// 设置5分钟锁定时间
					const minutes = 5;
					const lockoutEnd = Date.now() + minutes * 60 * 1000; // 5分钟后的时间戳
					setLockoutEndTime(lockoutEnd);
					startLockoutCountdown(lockoutEnd);
					message.error(`密码错误次数过多，系统已锁定${minutes}分钟`);
				} else {
					message.error(
						`密码错误，请重新输入。还剩 ${maxFailedAttempts - currentAttempts} 次尝试机会`
					);
				}

				form.resetFields();
				setPassword('');

				// 重新聚焦密码输入框（如果未锁定）
				if (passwordInputRef.current && !isInputLockedOut()) {
					setTimeout(() => {
						passwordInputRef.current?.focus();
					});
				}
			}
		} catch (error) {
			console.error('密码验证失败:', error);
			message.error('验证失败，请重试');
		} finally {
			setIsSubmitting(false);
		}
	};

	// 格式化剩余时间为分:秒格式
	const formatRemainingTime = () => {
		const minutes = Math.floor(remainingTime / 60);
		const seconds = remainingTime % 60;
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	};

	// 判断输入是否被禁用
	const isInputDisabled = isInputLockedOut() || isSubmitting;

	return (
		<div
			className="fixed w-screen h-screen z-50 inset-0 flex items-center justify-center bg-gray-50"
			style={{ zIndex: 999 }}
		>
			<div
				className="w-full max-w-md p-8 bg-white rounded-lg shadow-xl"
				tabIndex={0}
			>
				{/* 应用标题和Logo */}
				<div className="flex flex-col items-center mb-8">
					<Avatar src={Logo} size={66} />
					<h1 className="text-2xl font-bold text-gray-800">
						系统已锁定
					</h1>
					<p className="text-gray-500 mt-2">请输入密码解锁系统</p>
				</div>

				{/* 密码输入表单 */}
				<Form form={form} onFinish={handleSubmit} className="space-y-4">
					<Form.Item name="password">
						<Input.Password
							ref={passwordInputRef}
							prefix={<LockOutlined />}
							type="password"
							placeholder="请输入解锁密码"
							value={password}
							onChange={handlePasswordChange}
							autoComplete="current-password"
							size="large"
							disabled={isInputDisabled}
						/>
					</Form.Item>

					{/* 解锁按钮 */}
					<Form.Item>
						<Button
							type="primary"
							htmlType="submit"
							disabled={isInputDisabled}
							size="large"
							block
						>
							{isSubmitting ? (
								<span className="flex items-center space-x-2">
									<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
									<span>验证中...</span>
								</span>
							) : (
								'解锁系统'
							)}
						</Button>
					</Form.Item>
				</Form>

				{/* 显示锁定状态提示 */}
				{isInputLockedOut() && (
					<div className="mt-4">
						<Alert
							message={`密码错误次数过多，${formatRemainingTime()} 后可重试`}
							type="error"
							showIcon
						/>
					</div>
				)}

				{/* 显示失败次数提示 */}
				{!isInputLockedOut() && failedAttempts > 0 && (
					<div className="mt-4">
						<Alert
							message={`已失败 ${failedAttempts} 次，还剩 ${maxFailedAttempts - failedAttempts} 次尝试机会`}
							type="warning"
							showIcon
						/>
					</div>
				)}
			</div>
		</div>
	);
};

export default LockScreen;
