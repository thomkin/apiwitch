import { api, MyType } from '../src/api';
import { RawCreateParams } from 'zod';
import {ErrorMapPino} from '../src/types'
type Request = {
  test: string;
  manfred?: boolean;
};

const req: Request = {
  test: 'opel',
};

interface Response {
    t: string//now i aded a comment
}

type Manfred = { //Manfred
   test: string  //Manfred::test
   alfons: {
    name: string, //alfons name 
    phone: number, //alphons number
   },
    elf: MyType //Manfred::elf
    // record: ErrorMapPino
}

type tt = Response;

export const al : MyType = {test: "234"};

export const peter = api<Request, Response>(
  {
    auth: false, //a comment
    expose: true,
    method: 'GET',
    path: '/home/tesintg',
  },
  async (request: Request) => Promise<Response>{
    console.log('Test route called', request);
    return {} as Response;
  }
);
// export const manfred = api({ test: 'test1' });

// export const test = console.log('test');

// export const egon = <T>(arg: T): T => arg;
