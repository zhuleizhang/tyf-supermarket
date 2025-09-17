import { useEffect, useRef } from 'react';
import { useConfigStore } from '../store/config-store';
import { useMemoizedFn } from 'ahooks';

interface UseIdleTimerOptions {
	onIdle?: () => void;
}

/**
 * 用于监测用户操作并触发自动锁定的Hook
 */
const useIdleTimer = ({ onIdle }: UseIdleTimerOptions = {}) => {
	const { autoLockMinutes, loginPassword, setShouldInLockPage } =
		useConfigStore();
	const timerRef = useRef<number | null>(null);

	// 重置计时器
	const resetTimer = useMemoizedFn(() => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
		}

		// 如果设置了密码，则启动自动锁定计时器
		if (loginPassword && autoLockMinutes > 0) {
			timerRef.current = window.setTimeout(
				() => {
					if (onIdle) {
						onIdle();
					} else {
						// 默认行为：跳转到锁定页面
						// navigate('/lock-screen');
						setShouldInLockPage(true);
					}
				},
				autoLockMinutes * 60 * 1000
			);
		}
	});

	// 清除计时器
	const clearTimer = () => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	};

	// 监听用户活动事件
	useEffect(() => {
		const events = [
			'mousemove',
			'keydown',
			'click',
			'scroll',
			'touchstart',
		];
		const handleUserActivity = () => resetTimer();

		// 添加事件监听器
		events.forEach((event) => {
			document.addEventListener(event, handleUserActivity);
		});

		// 初始化计时器
		resetTimer();

		// 清理函数
		return () => {
			clearTimer();
			events.forEach((event) => {
				document.removeEventListener(event, handleUserActivity);
			});
		};
	}, [resetTimer]);

	return {
		resetTimer,
		clearTimer,
	};
};

export default useIdleTimer;
