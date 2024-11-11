import { CoreErrorCodes, HttpErrorCode, HttpErrorMsg } from './error';
import { catchError } from './utils';
import * as v from 'valibot';

export const routeRequestValidation = async (input: {
  witchcraftSchemas: { [key: string]: any };
  uuid: string;
  request: any;
  context: any;
}) => {
  //Then validate the inputs
  const requestSchema = input.witchcraftSchemas[input.uuid + '_valibot_request'];
  const [error] = await catchError(v.parseAsync(requestSchema, input.request));

  if (error) {
    return input.context.error(HttpErrorCode.BadRequest, {
      message: error.message,
      code: CoreErrorCodes.ValidationFailed,
    } as HttpErrorMsg);
  }
};
