import { create } from 'zustand';
import type { Product } from '../db';

// 结算商品项类型
export interface CartItem {
	product: Product;
	quantity: number;
	subtotal: number;
}

// 全局状态类型
export interface CartState {
	// 结算相关状态
	cartItems: CartItem[];
	totalAmount: number;
	searchKeyword: string;
	// 收银模式状态
	scanning: boolean;

	// 结算操作
	addToCart: (product: Product, quantity?: number) => void;
	removeFromCart: (productId: string) => void;
	updateCartItemQuantity: (productId: string, quantity: number) => void;
	clearCart: () => void;

	// 搜索操作
	setSearchKeyword: (keyword: string) => void;

	// 收银模式操作
	setScanning: (scanning: boolean) => void;
	toggleScanning: () => void;

	getCartItemCount: () => number;
}

// 创建Zustand store
export const useCartStore = create<CartState>((set, get) => ({
	// 初始状态
	cartItems: [],
	totalAmount: 0,
	searchKeyword: '',
	scanning: false,

	// 向购物车添加商品
	addToCart: (product: Product, quantity = 1) => {
		set((state) => {
			// 检查商品是否已在购物车中
			const existingItem = state.cartItems.find(
				(item) => item.product.id === product.id
			);

			if (existingItem) {
				// 更新已有商品的数量
				const updatedItems = state.cartItems.map((item) =>
					item.product.id === product.id
						? {
								...item,
								quantity: item.quantity + quantity,
								subtotal:
									(item.quantity + quantity) * product.price,
						  }
						: item
				);

				// 重新计算总价
				const newTotalAmount = updatedItems.reduce(
					(total, item) => total + item.subtotal,
					0
				);

				return {
					cartItems: updatedItems,
					totalAmount: newTotalAmount,
					currentBarcode: '', // 清空当前条码
				};
			} else {
				// 添加新商品
				const newItem: CartItem = {
					product,
					quantity,
					subtotal: product.price * quantity,
				};

				// 重新计算总价
				const newTotalAmount = state.totalAmount + newItem.subtotal;

				return {
					cartItems: [...state.cartItems, newItem],
					totalAmount: newTotalAmount,
					currentBarcode: '', // 清空当前条码
				};
			}
		});
	},

	// 从购物车移除商品
	removeFromCart: (productId: string) => {
		set((state) => {
			const itemToRemove = state.cartItems.find(
				(item) => item.product.id === productId
			);
			if (!itemToRemove) return state;

			const updatedItems = state.cartItems.filter(
				(item) => item.product.id !== productId
			);
			const newTotalAmount = state.totalAmount - itemToRemove.subtotal;

			return { cartItems: updatedItems, totalAmount: newTotalAmount };
		});
	},

	// 更新购物车商品数量
	updateCartItemQuantity: (productId: string, quantity: number) => {
		// 确保数量为正数
		if (quantity <= 0) {
			get().removeFromCart(productId);
			return;
		}

		set((state) => {
			const updatedItems = state.cartItems.map((item) => {
				if (item.product.id === productId) {
					const updatedItem = {
						...item,
						quantity,
						subtotal: item.product.price * quantity,
					};
					return updatedItem;
				}
				return item;
			});

			const newTotalAmount = updatedItems.reduce(
				(total, item) => total + item.subtotal,
				0
			);

			return { cartItems: updatedItems, totalAmount: newTotalAmount };
		});
	},

	// 清空购物车
	clearCart: () => {
		set({ cartItems: [], totalAmount: 0 });
	},

	// 设置搜索关键词
	setSearchKeyword: (keyword: string) => {
		set({ searchKeyword: keyword });
	},

	// 设置收银模式状态
	setScanning: (scanning: boolean) => {
		set({ scanning });
	},

	// 切换收银模式
	toggleScanning: () => {
		set((state) => ({ scanning: !state.scanning }));
	},

	// 获取购物车商品总数
	getCartItemCount: () => {
		return get().cartItems.reduce(
			(total, item) => total + item.quantity,
			0
		);
	},
}));
