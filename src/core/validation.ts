import { CoreErrorCodes, HttpErrorCode, HttpErrorMsg } from './error';
import * as v from 'valibot';

export const routeRequestValidation = (input: {
  witchcraftSchemas: { [key: string]: any };
  uuid: string;
  request: any;
  context: any;
}): { error: any; data: any } => {
  //Then validate the inputs
  const requestSchema = input.witchcraftSchemas[input.uuid + '_valibot_request'];
  if (!requestSchema) {
    return { data: {}, error: undefined };
  }

  try {
    const tmp = v.parse(requestSchema, input.request);
    return { data: tmp, error: undefined };
  } catch (error: any) {
    return {
      error: input.context.error(HttpErrorCode.BadRequest, {
        message: error?.message,
        code: CoreErrorCodes.ValidationFailed,
      } as HttpErrorMsg),
      data: undefined,
    };
  }
};
