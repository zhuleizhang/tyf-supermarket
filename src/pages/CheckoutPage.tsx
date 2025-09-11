import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, List, Typography, Divider, message, Modal } from 'antd';
import type { InputRef } from 'antd';
import { ScanOutlined, DeleteOutlined, PlusOutlined, MinusOutlined, RedoOutlined } from '@ant-design/icons';
import { productService, orderService, type Product, type Order, type CreateOrderData } from '../db';
import { useAppStore } from '../store';

const { Title, Text } = Typography;
const { Search } = Input;

interface CartItem {
  product: Product;
  quantity: number;
}

const CheckoutPage: React.FC = () => {
  // 购物车状态
  const [cart, setCart] = useState<CartItem[]>([]);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [scanning, setScanning] = useState<boolean>(false);
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState<boolean>(false);
  const [confirmAmount, setConfirmAmount] = useState<string>('');

  // 引用
  const barcodeRef = useRef<InputRef>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // 获取全局状态
  const { searchKeyword } = useAppStore();

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
      audioRef.current.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQ=';
      audioRef.current.play().catch(() => {});
    }
  };

  // 播放错误提示音
  const playErrorSound = () => {
    if (audioRef.current) {
      // 使用简短的错误提示音 URL
      audioRef.current.src = 'data:audio/wav;base64,UklGRiIAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YYQ=';
      audioRef.current.play().catch(() => {});
    }
  };

  // 计算总价
  useEffect(() => {
    const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    setTotalPrice(total);
  }, [cart]);

  // 自动聚焦到条码输入框
  useEffect(() => {
    if (scanning && barcodeRef.current) {
      barcodeRef.current.focus();
    }
  }, [scanning]);

  // 添加商品到购物车
  const addToCart = (product: Product, quantity: number = 1) => {
    setCart(prevCart => {
      // 检查商品是否已在购物车中
      const existingItemIndex = prevCart.findIndex(item => item.product.id === product.id);
      
      if (existingItemIndex >= 0) {
        // 如果已存在，增加数量
        const updatedCart = [...prevCart];
        updatedCart[existingItemIndex] = {
          ...updatedCart[existingItemIndex],
          quantity: updatedCart[existingItemIndex].quantity + quantity
        };
        return updatedCart;
      } else {
        // 如果不存在，添加新商品
        return [...prevCart, { product, quantity }];
      }
    });
    
    // 清空输入框并播放成功提示音
    setBarcodeInput('');
    playSuccessSound();
    message.success(`已添加 ${product.name}`);
  };

  // 处理条码输入
  const handleBarcodeInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const product = await productService.getByBarcode(barcodeInput.trim());
      if (product) {
        // 检查库存
        if (product.stock <= 0) {
          message.error(`${product.name} 库存不足`);
          playErrorSound();
        } else {
          addToCart(product);
        }
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

  // 调整商品数量
  const adjustQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.product.id === productId) {
          return { ...item, quantity: newQuantity };
        }
        return item;
      });
    });
  };

  // 从购物车移除商品
  const removeFromCart = (productId: string) => {
    setCart(prevCart => {
      return prevCart.filter(item => item.product.id !== productId);
    });
    message.success('已从购物车移除商品');
  };

  // 清空购物车
  const clearCart = () => {
    Modal.confirm({
      title: '确认清空',
      content: '确定要清空购物车吗？',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        setCart([]);
        message.success('购物车已清空');
      }
    });
  };

  // 显示结算确认弹窗
  const showConfirmModal = () => {
    if (cart.length === 0) {
      message.warning('购物车为空，无法结算');
      return;
    }
    setConfirmAmount(totalPrice.toString());
    setIsConfirmModalVisible(true);
  };

  // 处理结算
  const handleCheckout = async () => {
    if (cart.length === 0) {
      message.warning('购物车为空，无法结算');
      return;
    }

    setLoading(true);
    try {
      // 创建订单数据
      const orderItems = cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.product.price,
        subtotal: item.product.price * item.quantity
      }));

      const order: CreateOrderData = {
        items: orderItems,
        totalAmount: totalPrice
      };

      // 保存订单
      const orderResult = await orderService.create(order);

      // 更新商品库存
      for (const item of cart) {
        await productService.update(item.product.id, {
          stock: item.product.stock - item.quantity
        });
      }

      // 清空购物车
      setCart([]);
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

  // 使用全局搜索关键词添加商品
  useEffect(() => {
    if (searchKeyword) {
      // 这里可以实现根据全局搜索关键词快速添加商品的逻辑
      // 例如：通过搜索关键词查找商品并提示用户是否添加
      console.log('Global search keyword:', searchKeyword);
    }
  }, [searchKeyword]);

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <Title level={3}>收银结算</Title>
        <Button
          type={scanning ? 'primary' : 'default'}
          icon={<ScanOutlined />}
          onClick={toggleScanningMode}
        >
          {scanning ? '退出扫描模式' : '进入扫描模式'}
        </Button>
      </div>

      {/* 条码输入区域 */}
      <div className={`mb-6 ${scanning ? 'scale-110 shadow-lg' : ''} transition-all duration-300`}>
        <Search
          ref={barcodeRef}
          value={barcodeInput}
          onChange={handleBarcodeInput}
          onSearch={handleBarcodeSearch}
          onKeyPress={handleKeyPress}
          placeholder={scanning ? '扫描商品条码...' : '输入商品条码'}
          enterButton="添加"
          size="large"
          loading={loading}
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* 购物车商品列表 */}
        <div className="lg:w-2/3">
          <Title level={4} className="mb-4">购物车</Title>
          {cart.length > 0 ? (
            <List
              bordered
              dataSource={cart}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button
                      type="text"
                      icon={<MinusOutlined />}
                      onClick={() => adjustQuantity(item.product.id, item.quantity - 1)}
                    />,
                    <Button
                      type="text"
                      icon={<PlusOutlined />}
                      onClick={() => adjustQuantity(item.product.id, item.quantity + 1)}
                    />,
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeFromCart(item.product.id)}
                    />
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <div className="flex justify-between items-center w-full">
                        <span className="font-medium">{item.product.name}</span>
                        <span>¥{item.product.price.toFixed(2)}</span>
                      </div>
                    }
                    description={
                      <div className="flex justify-between items-center w-full">
                        <span className="text-gray-500">条码: {item.product.barcode}</span>
                        <span className="font-medium">数量: {item.quantity}</span>
                      </div>
                    }
                  />
                </List.Item>
              )}
              locale={{
                emptyText: '购物车为空'
              }}
            />
          ) : (
            <div className="text-center p-10 bg-gray-50 rounded-lg">
              <Text type="secondary">购物车为空，请添加商品</Text>
            </div>
          )}
        </div>

        {/* 结算区域 */}
        <div className="lg:w-1/3">
          <div className="bg-gray-50 p-6 rounded-lg">
            <Title level={4} className="mb-4">结算信息</Title>
            <div className="space-y-4">
              <div className="flex justify-between text-lg">
                <Text>商品总数:</Text>
                <Text strong>{cart.reduce((sum, item) => sum + item.quantity, 0)} 件</Text>
              </div>
              <div className="flex justify-between text-lg">
                <Text>总金额:</Text>
                <Text strong className="text-red-600">¥{totalPrice.toFixed(2)}</Text>
              </div>
              <Divider />
              <div className="space-y-2">
                <Button
                  type="default"
                  icon={<RedoOutlined />}
                  onClick={clearCart}
                  className="w-full"
                  disabled={cart.length === 0}
                >
                  清空购物车
                </Button>
                <Button
                  type="primary"
                  size="large"
                  onClick={showConfirmModal}
                  className="w-full"
                  disabled={cart.length === 0 || loading}
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
            <Text strong>{cart.reduce((sum, item) => sum + item.quantity, 0)} 件</Text>
          </div>
          <div className="flex justify-between">
            <Text>应付金额:</Text>
            <Text strong className="text-red-600 text-lg">¥{totalPrice.toFixed(2)}</Text>
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