import React, { useEffect } from 'react';
import {
	HashRouter as Router,
	Routes,
	Route,
	Navigate,
} from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import AppLayout from './components/Layout';
import ProductsPage from './pages/ProductsPage';
import CheckoutPage from './pages/CheckoutPage';
import StatisticsPage from './pages/StatisticsPage';
import OrdersPage from './pages/OrdersPage';
import CategoriesPage from './pages/CategoriesPage';
import SettingsPage from './pages/SettingsPage';
import LockScreen from './pages/LockScreen';
import { initializeData } from './db/initData';
import { useAutoTimeout } from './hooks/useAutoTimeout';
import { useAutoBackup } from './hooks/useAutoBackup.tsx';
import useIdleTimer from './hooks/useIdleTimer';
import dayjs from 'dayjs';
// 导入dayjs中文locale
import 'dayjs/locale/zh-cn';
import { useConfigStore } from './store/config-store.ts';
// 设置dayjs默认使用中文
dayjs.locale('zh-cn');

// 创建一个包装组件来处理自动超时逻辑，确保在 Router 内部使用
const AutoTimeoutWrapper: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	useAutoTimeout();
	useIdleTimer(); // 集成自动锁定功能
	return <>{children}</>;
};

function App() {
	const shouldInLockPage = useConfigStore((s) => s.shouldInLockPage);
	const loginPassword = useConfigStore((s) => s.loginPassword);
	const autoLockMinutes = useConfigStore((s) => s.autoLockMinutes);
	const setShouldInLockPage = useConfigStore((s) => s.setShouldInLockPage);

	// 初始化数据
	useEffect(() => {
		const init = async () => {
			try {
				await initializeData();
			} catch (error) {
				console.error('初始化数据失败:', error);
			}
		};
		init();
	}, []);

	// 添加应用退出前事件监听
	useEffect(() => {
		// 检查是否在Electron环境中
		if (window.electron?.onAppBeforeQuit) {
			// 注册应用退出前的事件监听
			const cleanup = window.electron.onAppBeforeQuit(() => {
				console.log('应用即将退出，锁定屏幕');
				setShouldInLockPage(true);
			});

			// 组件卸载时清理事件监听
			return cleanup;
		}
	}, [setShouldInLockPage]);

	// 添加平台检测逻辑
	useEffect(() => {
		// 检查是否在Electron环境中
		if (window.electron?.onAppLoaded) {
			// 注册应用加载完成的事件监听
			const cleanup = window.electron.onAppLoaded((data) => {
				console.log(`应用已加载，运行平台: ${data.platform}`);
				// 可以根据平台类型执行不同的初始化逻辑
				if (data.platform === 'windows') {
					console.log('Windows平台特定初始化');
					if (loginPassword && autoLockMinutes) {
						setShouldInLockPage(true);
					}
					// Windows特定逻辑
				} else if (data.platform === 'mac') {
					console.log('Mac平台特定初始化');
					// Mac特定逻辑
				} else if (data.platform === 'linux') {
					console.log('Linux平台特定初始化');
					// Linux特定逻辑
				}
			});

			// 组件卸载时清理事件监听
			return cleanup;
		}
	}, []);

	// 集成自动备份功能
	useAutoBackup();

	return (
		<ConfigProvider locale={zhCN}>
			{shouldInLockPage ? (
				<div className="absolute top-0 left-0 right-0 bottom-0">
					<LockScreen></LockScreen>
				</div>
			) : (
				<Router>
					<AutoTimeoutWrapper>
						<AppLayout>
							<Routes>
								<Route
									path="/"
									element={
										<Navigate to="/checkout" replace />
									}
								/>
								<Route
									path="/checkout"
									element={<CheckoutPage />}
								/>
								<Route
									path="/products"
									element={<ProductsPage />}
								/>
								<Route
									path="/categories"
									element={<CategoriesPage />}
								/>
								<Route
									path="/statistics"
									element={<StatisticsPage />}
								/>
								<Route
									path="/orders"
									element={<OrdersPage />}
								/>
								<Route
									path="/settings"
									element={<SettingsPage />}
								/>
							</Routes>
						</AppLayout>
					</AutoTimeoutWrapper>
				</Router>
			)}
		</ConfigProvider>
	);
}

export default App;
