import { Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { GqlArgumentsHost, GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import { DomainError } from '../errors/domain-error';
import { logger } from '../utils/logger';

@Catch()
export class GraphQLExceptionFilter implements GqlExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const gqlHost = GqlArgumentsHost.create(host);
    const info = gqlHost.getInfo();
    const context = gqlHost.getContext();

    // Guard against non-GraphQL requests (e.g., health probes on "/")
    const fieldName = info?.fieldName;
    const path = info?.path;

    if (exception instanceof DomainError) {
      logger.info('Domain error in GraphQL', {
        errorCode: exception.code,
        message: exception.message,
        fieldName,
        path,
        userId: context?.req?.session?.userId,
      });

      return new GraphQLError(exception.message, {
        extensions: {
          code: exception.code,
          httpStatus: exception.httpStatus,
        },
      });
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message = typeof response === 'string' ? response : (response as any).message;

      logger.info('HTTP exception in GraphQL', {
        statusCode: status,
        message,
        fieldName,
        path,
      });

      return new GraphQLError(message, {
        extensions: {
          code: `HTTP_${status}`,
          httpStatus: status,
        },
      });
    }

    const error = exception as Error;
    
    logger.error('Unexpected error in GraphQL', {
      error: error.message,
      stack: error.stack,
      fieldName,
      path,
      userId: context?.req?.session?.userId,
    });

    return new GraphQLError('Internal server error', {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        httpStatus: 500,
      },
    });
  }
}
