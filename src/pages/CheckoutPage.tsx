/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useRef, useEffect } from 'react';
import {
	Button,
	Input,
	List,
	Typography,
	Divider,
	message,
	Modal,
	Tooltip,
} from 'antd';
import type { InputRef } from 'antd';
import {
	ScanOutlined,
	DeleteOutlined,
	PlusOutlined,
	MinusOutlined,
	RedoOutlined,
} from '@ant-design/icons';
import {
	productService,
	orderService,
	type Product,
	type CreateOrderData,
} from '../db';
import { useAppStore } from '../store';

const { Title, Text } = Typography;

const CheckoutPage: React.FC = () => {
	// 购物车状态
	const [scanning, setScanning] = useState<boolean>(false);
	const [barcodeInput, setBarcodeInput] = useState<string>('');
	const [loading, setLoading] = useState<boolean>(false);
	const [isConfirmModalVisible, setIsConfirmModalVisible] =
		useState<boolean>(false);
	const [confirmAmount, setConfirmAmount] = useState<string>('');

	// 引用
	const barcodeRef = useRef<InputRef>(null);
	const audioRef = useRef<HTMLAudioElement | null>(null);

	const addToStoreCart = useAppStore((state) => state.addToCart);
	const clearCart = useAppStore((state) => state.clearCart);
	const updateCartItemQuantity = useAppStore(
		(state) => state.updateCartItemQuantity
	);
	const removeFromCart = useAppStore((state) => state.removeFromCart);
	const cartItems = useAppStore((state) => state.cartItems);
	const cartTotalPrice = useAppStore((state) => state.totalAmount);
	const getCartItemCount = useAppStore((state) => state.getCartItemCount);

	// 初始化音频
	useEffect(() => {
		audioRef.current = new Audio();
		audioRef.current.volume = 0.5;

		return () => {
			if (audioRef.current) {
				audioRef.current.pause();
				audioRef.current = null;
			}
		};
	}, []);

	// 播放成功提示音
	const playSuccessSound = () => {
		if (audioRef.current) {
			// 使用简短的成功提示音 URL
			audioRef.current.src =
				'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQ=';
			audioRef.current.play().catch(() => {});
		}
	};

	// 播放错误提示音
	const playErrorSound = () => {
		if (audioRef.current) {
			// 使用简短的错误提示音 URL
			audioRef.current.src =
				'data:audio/wav;base64,UklGRiIAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YYQ=';
			audioRef.current.play().catch(() => {});
		}
	};

	// 自动聚焦到条码输入框
	useEffect(() => {
		if (scanning && barcodeRef.current) {
			barcodeRef.current.focus();
		}
	}, [scanning]);

	// 添加商品到购物车
	const addToCart = (product: Product, quantity: number = 1) => {
		addToStoreCart(product, quantity);
		// 清空输入框并播放成功提示音
		setBarcodeInput('');
		playSuccessSound();
		message.success(`已添加 ${product.name}`);
	};

	// 处理条码输入
	const handleBarcodeInput = async (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		const value = e.target.value;
		setBarcodeInput(value);
	};

	// 处理条码搜索
	const handleBarcodeSearch = async () => {
		if (!barcodeInput.trim()) {
			message.warning('请输入商品条码');
			return;
		}

		setLoading(true);
		try {
			const product = await productService.getByBarcode(
				barcodeInput.trim()
			);
			if (product) {
				// 检查库存
				addToCart(product);
			} else {
				message.error('未找到该商品');
				playErrorSound();
			}
		} catch (error) {
			message.error('搜索商品失败');
			playErrorSound();
		} finally {
			setLoading(false);
		}
	};

	// 处理键盘回车事件
	const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') {
			handleBarcodeSearch();
		}
	};

	// 从购物车移除商品
	const handleRemoveFromCart = (productId: string) => {
		removeFromCart(productId);
		message.success('已从购物车移除商品');
	};

	// 清空购物车
	const handleClearCart = () => {
		Modal.confirm({
			title: '确认清空',
			content: '确定要清空购物车吗？',
			okText: '确认',
			cancelText: '取消',
			onOk: () => {
				clearCart();
				message.success('购物车已清空');
			},
		});
	};

	// 显示结算确认弹窗
	const showConfirmModal = () => {
		if (cartItems.length === 0) {
			message.warning('购物车为空，无法结算');
			return;
		}
		setConfirmAmount(cartTotalPrice.toString());
		setIsConfirmModalVisible(true);
	};

	// 处理结算
	const handleCheckout = async () => {
		if (cartItems.length === 0) {
			message.warning('购物车为空，无法结算');
			return;
		}

		setLoading(true);
		try {
			// 创建订单数据
			const orderItems = cartItems.map((item) => ({
				productId: item.product.id,
				quantity: item.quantity,
				unitPrice: item.product.price,
				subtotal: item.product.price * item.quantity,
			}));

			const order: CreateOrderData = {
				items: orderItems,
				totalAmount: cartTotalPrice,
			};

			// 保存订单
			const orderResult = await orderService.create(order);

			// 清空购物车
			clearCart();
			setIsConfirmModalVisible(false);

			// 显示结算成功信息
			message.success(`结算成功！订单号：${orderResult.orderId}`);
		} catch (error) {
			message.error('结算失败，请重试');
		} finally {
			setLoading(false);
		}
	};

	// 切换扫描模式
	const toggleScanningMode = () => {
		const newScanningState = !scanning;
		setScanning(newScanningState);
		if (newScanningState && barcodeRef.current) {
			barcodeRef.current.focus();
		}
	};

	return (
		<div
			className={`flex flex-col p-6 bg-white h-full rounded-lg shadow ${
				scanning ? 'absolute top-0 left-0 right-0 bottom-0' : ''
			} transition-all duration-300`}
		>
			<div className="flex justify-between items-center mb-6">
				<Title level={3}>收银结算</Title>
				<Button
					type={scanning ? 'default' : 'primary'}
					icon={<ScanOutlined />}
					onClick={toggleScanningMode}
				>
					{scanning ? '退出收银模式' : '进入收银模式'}
				</Button>
			</div>

			{/* 条码输入区域 */}
			<div className={`flex gap-2 items-center mb-6`}>
				<Input
					ref={barcodeRef}
					value={barcodeInput}
					onChange={handleBarcodeInput}
					onKeyDown={handleKeyPress}
					placeholder={'扫描商品条码或输入商品条码数字'}
					size="large"
				/>
				<Button
					onClick={handleBarcodeSearch}
					loading={loading}
					size="large"
					type="primary"
					icon={<PlusOutlined />}
				>
					添加商品
				</Button>
			</div>

			<div className="flex gap-6 flex-1 h-0">
				{/* 购物车商品列表 */}
				<div className="flex flex-col w-2/3">
					<Title level={4} className="mb-4">
						购物车
					</Title>
					{cartItems.length > 0 ? (
						<List
							bordered
							className="flex-1 h-0 overflow-auto"
							dataSource={cartItems}
							renderItem={(item) => (
								<List.Item
									actions={[
										<Tooltip title="点击减少数量">
											<Button
												type="text"
												icon={<MinusOutlined />}
												onClick={() =>
													updateCartItemQuantity(
														item.product.id,
														item.quantity - 1
													)
												}
											/>
										</Tooltip>,
										<Tooltip title="点击增加数量">
											<Button
												type="text"
												icon={<PlusOutlined />}
												onClick={() =>
													updateCartItemQuantity(
														item.product.id,
														item.quantity + 1
													)
												}
											/>
										</Tooltip>,
										<Tooltip title="点击移除商品">
											<Button
												type="text"
												danger
												icon={<DeleteOutlined />}
												onClick={() =>
													handleRemoveFromCart(
														item.product.id
													)
												}
											/>
										</Tooltip>,
									]}
								>
									<List.Item.Meta
										title={
											<div className="flex justify-between items-center w-full">
												<span className="font-medium text-xl">
													{item.product.name}
												</span>
												<span className="text-xl">
													¥
													{item.product.price.toFixed(
														2
													)}
												</span>
											</div>
										}
										description={
											<div className="flex justify-between items-center w-full">
												<span className="text-gray-500">
													条码: {item.product.barcode}
												</span>
												<span className="font-medium">
													数量: {item.quantity}
												</span>
											</div>
										}
									/>
								</List.Item>
							)}
							locale={{
								emptyText: '购物车为空',
							}}
						/>
					) : (
						<div className="text-center p-10 bg-gray-50 rounded-lg">
							<Text type="secondary">购物车为空，请添加商品</Text>
						</div>
					)}
				</div>

				{/* 结算区域 */}
				<div className="w-1/3">
					<div className="rounded-lg">
						<Title level={4} className="mb-4">
							结算信息
						</Title>
						<div className="space-y-4">
							<div className="flex justify-between text-lg">
								<Text>商品总数:</Text>
								<Text strong>{getCartItemCount()} 件</Text>
							</div>
							<div className="flex justify-between text-lg">
								<Text>总金额:</Text>
								<Text
									strong
									className="text-red-600 text-xl font-bold"
								>
									¥{cartTotalPrice.toFixed(2)}
								</Text>
							</div>
							<Divider />
							<div className="space-y-2">
								<Button
									type="default"
									icon={<RedoOutlined />}
									onClick={handleClearCart}
									className="w-full"
									disabled={cartItems.length === 0}
								>
									清空购物车
								</Button>
								<Button
									type="primary"
									size="large"
									onClick={showConfirmModal}
									className="w-full"
									disabled={cartItems.length === 0 || loading}
									loading={loading}
								>
									结算
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* 结算确认弹窗 */}
			<Modal
				title="确认结算"
				open={isConfirmModalVisible}
				onOk={handleCheckout}
				onCancel={() => setIsConfirmModalVisible(false)}
				okText="确认支付"
				cancelText="取消"
				confirmLoading={loading}
			>
				<div className="space-y-4">
					<div className="flex justify-between">
						<Text>购物车商品总数:</Text>
						<Text strong>{getCartItemCount()} 件</Text>
					</div>
					<div className="flex justify-between">
						<Text>应付金额:</Text>
						<Text strong className="text-red-600 text-lg">
							¥{cartTotalPrice.toFixed(2)}
						</Text>
					</div>
					<Input
						value={confirmAmount}
						onChange={(e) => setConfirmAmount(e.target.value)}
						placeholder="请输入实际支付金额"
						type="number"
						addonBefore="¥"
					/>
				</div>
			</Modal>
		</div>
	);
};

export default CheckoutPage;
