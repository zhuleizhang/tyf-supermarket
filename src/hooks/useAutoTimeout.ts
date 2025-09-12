import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useConfigStore } from '../store/config-store';

// 收银模式状态 store
import { useCartStore } from '../store/cart-store';
import { message } from 'antd';
import { useMemoizedFn } from 'ahooks';

interface UseAutoTimeoutProps {
	// 可选的自定义超时回调
	onTimeout?: () => void;
}

/**
 * 处理自动超时逻辑的钩子
 * 1. 当页面超过设定的时间内无操作时，自动跳转至收银结算页面，并进入收银模式
 * 2. 当在收银结算页面的情况下，超过设定的时间内无操作时，自动进入收银模式
 */
export const useAutoTimeout = ({ onTimeout }: UseAutoTimeoutProps = {}) => {
	const navigate = useNavigate();
	const location = useLocation();
	const { autoReturnToCheckoutMinutes, autoEnterCheckoutModeMinutes } =
		useConfigStore();

	const setScanning = useCartStore((state) => state.setScanning);

	// 定时器引用
	const returnTimerRef = useRef<NodeJS.Timeout | null>(null);
	const modeTimerRef = useRef<NodeJS.Timeout | null>(null);

	// 重置定时器 - 使用 useCallback 避免每次渲染重新创建
	const resetTimers = useMemoizedFn(() => {
		console.log('resetTimers');

		// 清除现有的定时器
		if (returnTimerRef.current) {
			clearTimeout(returnTimerRef.current);
		}
		if (modeTimerRef.current) {
			clearTimeout(modeTimerRef.current);
		}

		// 重新设置定时器（如果功能未禁用）
		if (autoReturnToCheckoutMinutes > 0) {
			returnTimerRef.current = setTimeout(() => {
				// 只有不在收银页面时才需要跳转
				if (location.pathname !== '/checkout') {
					navigate('/checkout');
					// 清空购物车，进入收银模式
					setScanning(true);
					message.info('已自动返回收银结算页面并进入收银模式');
					if (onTimeout) {
						onTimeout();
					}
				}
			}, autoReturnToCheckoutMinutes * 60 * 1000); // 转换为毫秒
		}

		if (autoEnterCheckoutModeMinutes > 0) {
			modeTimerRef.current = setTimeout(() => {
				// 在任何页面都可以进入收银模式
				setScanning(true);
				message.info('已自动进入收银模式');
				if (onTimeout) {
					onTimeout();
				}
			}, autoEnterCheckoutModeMinutes * 60 * 1000); // 转换为毫秒
		}
	});

	// 监听用户操作
	useEffect(() => {
		const handleUserActivity = () => {
			resetTimers();
		};

		// 添加事件监听器
		// window.addEventListener('mousemove', handleUserActivity);
		window.addEventListener('keydown', handleUserActivity);
		window.addEventListener('click', handleUserActivity);
		window.addEventListener('scroll', handleUserActivity);

		// 初始设置定时器
		resetTimers();

		// 清理函数
		return () => {
			// 移除事件监听器
			// window.removeEventListener('mousemove', handleUserActivity);
			window.removeEventListener('keydown', handleUserActivity);
			window.removeEventListener('click', handleUserActivity);
			window.removeEventListener('scroll', handleUserActivity);

			// 清除定时器
			if (returnTimerRef.current) {
				clearTimeout(returnTimerRef.current);
			}
			if (modeTimerRef.current) {
				clearTimeout(modeTimerRef.current);
			}
		};
	}, [resetTimers]);
};
