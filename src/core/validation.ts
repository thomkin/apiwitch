import { CoreErrorCodes, HttpErrorCode, HttpErrorMsg } from './error';
import * as v from 'valibot';

export const minifyValibotError = (issues: Array<any>) => {
  const minifiedData = issues.map((issue) => {
    return { message: issue.message, key: issue.path[0].key };
  });

  return minifiedData;
  // return JSON.stringify(minifiedData, null, 2);
};

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

  const valibot = v.safeParse(requestSchema, input.request);
  if (valibot.success) {
    return { data: valibot.output, error: undefined };
  }

  return {
    error: input.context.error(HttpErrorCode.BadRequest, {
      message: minifyValibotError(valibot.issues),
      code: CoreErrorCodes.ValidationFailed,
    } as HttpErrorMsg),
    data: undefined,
  };
};
