export interface RoutifyConfig {
  includes: string[]; //define path where we shall search for typescript files. Path will be searched recursively
  librarySearchString: string; //the name of the library that exports the api() function to register routes
  apiAddRouterFunc: string; //the name of the function that can register api handlers
}

export type IterReturn = { [key: string]: any };

/** DELETE these !!! */
export type User = {
  id: string;
  name: string;
  email: string;
};

export type ErrorMapPino = {
  data: string;
  user: User;
  water: string;
  interface: boolean;
};
