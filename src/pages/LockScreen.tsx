import React, { useEffect, useRef, useState } from 'react';
import { Avatar, Button, Form, Input, message, notification } from 'antd';
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
	const passwordInputRef = useRef<InputRef>(null);
	const {
		loginPassword,
		failedAttempts,
		incrementFailedAttempts,
		resetFailedAttempts,
		setShouldInLockPage,
	} = useConfigStore();

	// 自动聚焦密码输入框
	useEffect(() => {
		if (passwordInputRef.current) {
			passwordInputRef.current.focus();
		}
	}, []);

	// 处理密码输入变化
	const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setPassword(e.target.value);
		console.log(e.target.value, '');
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
						duration: 0,
					});
					// 重置失败尝试次数
					resetFailedAttempts();
				}
				setShouldInLockPage(false);
				// 重定向到首页或上次访问的页面
			} else {
				// 密码错误，增加失败尝试次数
				incrementFailedAttempts();
				message.error('密码错误，请重新输入');
				form.resetFields();
				setPassword('');

				// 重新聚焦密码输入框
				if (passwordInputRef.current) {
					passwordInputRef.current.focus();
				}
			}
		} catch (error) {
			console.error('密码验证失败:', error);
			message.error('验证失败，请重试');
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="fixed w-screen h-screen z-50 inset-0 flex items-center justify-center bg-gray-50">
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
							placeholder="请输入开机密码"
							value={password}
							onChange={handlePasswordChange}
							autoComplete="current-password"
							maxLength={20}
							className="h-12"
						/>
					</Form.Item>

					{/* 解锁按钮 */}
					<Form.Item>
						<Button
							type="primary"
							htmlType="submit"
							disabled={isSubmitting}
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
			</div>
		</div>
	);
};

export default LockScreen;
