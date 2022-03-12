import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const newCart = [...cart];
      const productExists = newCart.find(product => productId === product.id);      
      const stock = await api.get<Stock>(`stock/${productId}`).then(response => response.data);
      const amount = productExists ? productExists.amount + 1 : 1; // se o produto já existir, soma 1 ao amount, senão, 1
      
      if (amount > stock.amount ){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(productExists){
        productExists.amount = amount; // As alterações refletem automaticamente no produto dentro do newCart
      }else{
        const product = await api.get(`products/${productId}`).then(response => response.data);
        const newProduct = {
          ...product, // O novo produto terá dos os campos do product 
          amount: 1, // E terá também o campo amount, porque o carrinho é do tipo Product
        }
        newCart.push(newProduct); // Adicionando o novo produto no carrinho
      }
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart)); // Salva o novo carrinho no localStorage
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = [...cart]; // Cria um novo carrinho
      const index = newCart.findIndex(p => p.id === productId); // Busca o index do produto no carrinho
      if (index === -1) { // Se não encontrar o produto no carrinho
        throw Error(); // Lança um erro
      }
      newCart.splice(index,1); // Remove o produto do carrinho
      setCart(newCart); // Atualiza o carrinho
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart)); // Salva o novo carrinho no localStorage
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {      
      if (amount <= 0){ // Se a quantidade for menor ou igual a 0
        return; // Retorna
      }      
      const stock = await api.get<Stock>(`stock/${productId}`).then(response => response.data);
      if (stock.amount < amount ){ // Se a quantidade solicitada for maior que a disponível        
        toast.error('Quantidade solicitada fora de estoque'); // Exibe um toast de erro
        return;
      }
      
      const newCart = [...cart]
      const product = newCart.find((product: Product) => productId === product.id); // Busca o produto no carrinho
      if(!product){ // Se não encontrar o produto no carrinho
        throw Error() // Lança um erro
      }      
      product.amount = amount; // Atualiza a quantidade do produto no carrinho
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart)); // Salva o novo carrinho no localStorage
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
