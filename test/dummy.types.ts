export type Simple = {
  name: string;
  isValid: boolean;
  hasMoutFull?: string;
};

export type SimpleNested = {
  user: {
    fish: string;
    size: number;
  };
};

// export type SimpleNested = RpcRequest<{
//   kinder: string;
// }>;
