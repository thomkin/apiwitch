//Function that can add routes to the api
export interface RouteOptions {
  path: string;
  method: string;
  expose: boolean;
  auth: string | boolean;
}

export const api = async <Request, Response>(
  options: RouteOptions,
  callback: (request: Request) => Promise<Response>
): Promise<Response> => {
  console.log('TODO: call the frame work function to add routes');
  return {} as Response;
};

// export const api = (req: Request) => console.log('Replace me with propper functio');
// export const apiwrong = () => console.log('Replace me with propper functio');

export type MyType = {
  //HERE!!!
  monopoli: string; //MYTYPE::test
};
