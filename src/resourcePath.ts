import * as Expressions from './expressions';
import * as Lexer from './lexer';
import * as NameOrIdentifier from './nameOrIdentifier';
import * as PrimitiveLiteral from './primitiveLiteral';
import Utils, { SourceArray } from './utils';

export function resourcePath(
  value: SourceArray,
  index: number,
  metadataContext?: any
): Lexer.Token {
  if (value[index] === 0x2f) {
    index++;
  }
  const token =
    batch(value, index) ||
    entity(value, index, metadataContext) ||
    metadata(value, index);
  if (token) {
    return token;
  }

  const resource =
    NameOrIdentifier.entitySetName(value, index, metadataContext) ||
    functionImportCall(value, index, metadataContext) ||
    crossjoin(value, index) ||
    all(value, index) ||
    actionImportCall(value, index, metadataContext) ||
    NameOrIdentifier.singletonEntity(value, index);

  if (!resource) {
    return;
  }
  const start = index;
  index = resource.next;
  let navigation: Lexer.Token;

  switch (resource.type) {
    case Lexer.TokenType.EntitySetName:
      navigation = collectionNavigation(
        value,
        resource.next,
        resource.metadata
      );
      metadataContext = resource.metadata;
      delete resource.metadata;
      break;
    case Lexer.TokenType.EntityCollectionFunctionImportCall:
      navigation = collectionNavigation(
        value,
        resource.next,
        resource.value.import.metadata
      );
      metadataContext = resource.value.import.metadata;
      delete resource.value.import.metadata;
      break;
    case Lexer.TokenType.SingletonEntity:
      navigation = singleNavigation(value, resource.next, resource.metadata);
      metadataContext = resource.metadata;
      delete resource.metadata;
      break;
    case Lexer.TokenType.EntityFunctionImportCall:
      navigation = singleNavigation(
        value,
        resource.next,
        resource.value.import.metadata
      );
      metadataContext = resource.value.import.metadata;
      delete resource.value.import.metadata;
      break;
    case Lexer.TokenType.ComplexCollectionFunctionImportCall:
    case Lexer.TokenType.PrimitiveCollectionFunctionImportCall:
      navigation = collectionPath(
        value,
        resource.next,
        resource.value.import.metadata
      );
      metadataContext = resource.value.import.metadata;
      delete resource.value.import.metadata;
      break;
    case Lexer.TokenType.ComplexFunctionImportCall:
      navigation = complexPath(
        value,
        resource.next,
        resource.value.import.metadata
      );
      metadataContext = resource.value.import.metadata;
      delete resource.value.import.metadata;
      break;
    case Lexer.TokenType.PrimitiveFunctionImportCall:
      navigation = singlePath(
        value,
        resource.next,
        resource.value.import.metadata
      );
      metadataContext = resource.value.import.metadata;
      delete resource.value.import.metadata;
      break;
  }

  if (navigation) {
    index = navigation.next;
  }
  if (value[index] === 0x2f) {
    index++;
  }
  if (resource) {
    return Lexer.tokenize(
      value,
      start,
      index,
      { resource, navigation },
      Lexer.TokenType.ResourcePath,
      navigation || <any>{ metadata: metadataContext }
    );
  }
}

export function batch(value: SourceArray, index: number): Lexer.Token {
  if (Utils.equals(value, index, '$batch')) {
    return Lexer.tokenize(
      value,
      index,
      index + 6,
      '$batch',
      Lexer.TokenType.Batch
    );
  }
}

export function entity(
  value: SourceArray,
  index: number,
  metadataContext?: any
): Lexer.Token {
  if (Utils.equals(value, index, '$entity')) {
    const start = index;
    index += 7;

    let name;
    if (value[index] === 0x2f) {
      name = NameOrIdentifier.qualifiedEntityTypeName(
        value,
        index + 1,
        metadataContext
      );
      if (!name) {
        return;
      }
      index = name.next;
    }

    return Lexer.tokenize(
      value,
      start,
      index,
      name || '$entity',
      Lexer.TokenType.Entity
    );
  }
}

export function metadata(value: SourceArray, index: number): Lexer.Token {
  if (Utils.equals(value, index, '$metadata')) {
    return Lexer.tokenize(
      value,
      index,
      index + 9,
      '$metadata',
      Lexer.TokenType.Metadata
    );
  }
}

export function collectionNavigation(
  value: SourceArray,
  index: number,
  metadataContext?: any
): Lexer.Token {
  const start = index;
  let name;
  if (value[index] === 0x2f) {
    name = NameOrIdentifier.qualifiedEntityTypeName(
      value,
      index + 1,
      metadataContext
    );
    if (name) {
      index = name.next;
      metadataContext = name.value.metadata;
      delete name.value.metadata;
    }
  }

  const path = collectionNavigationPath(value, index, metadataContext);
  if (path) {
    index = path.next;
  }

  if (!name && !path) {
    return;
  }

  return Lexer.tokenize(
    value,
    start,
    index,
    { name, path },
    Lexer.TokenType.CollectionNavigation,
    path || name
  );
}

export function collectionNavigationPath(
  value: SourceArray,
  index: number,
  metadataContext?: any
): Lexer.Token {
  const start = index;
  const token =
    collectionPath(value, index, metadataContext) ||
    Expressions.refExpr(value, index);
  if (token) {
    return token;
  }

  const predicate = Expressions.keyPredicate(value, index, metadataContext);
  if (predicate) {
    let tokenValue: any = { predicate };
    index = predicate.next;

    const navigation = singleNavigation(value, index, metadataContext);
    if (navigation) {
      tokenValue = { predicate, navigation };
      index = navigation.next;
    }

    return Lexer.tokenize(
      value,
      start,
      index,
      tokenValue,
      Lexer.TokenType.CollectionNavigationPath,
      navigation || <any>{ metadata: metadataContext }
    );
  }
}

export function singleNavigation(
  value: SourceArray,
  index: number,
  metadataContext?: any
): Lexer.Token {
  let token =
    boundOperation(value, index, false, metadataContext) ||
    Expressions.refExpr(value, index) ||
    Expressions.valueExpr(value, index);
  if (token) {
    return token;
  }

  const start = index;
  let name;

  if (value[index] === 0x2f) {
    name = NameOrIdentifier.qualifiedEntityTypeName(
      value,
      index + 1,
      metadataContext
    );
    if (name) {
      index = name.next;
      metadataContext = name.value.metadata;
      delete name.value.metadata;
    }
  }

  if (value[index] === 0x2f) {
    token = propertyPath(value, index + 1, metadataContext);
    if (token) {
      index = token.next;
    }
  }

  if (!name && !token) {
    return;
  }

  return Lexer.tokenize(
    value,
    start,
    index,
    { name, path: token },
    Lexer.TokenType.SingleNavigation,
    token
  );
}

export function propertyPath(
  value: SourceArray,
  index: number,
  metadataContext?: any
): Lexer.Token {
  const token =
    NameOrIdentifier.entityColNavigationProperty(
      value,
      index,
      metadataContext
    ) ||
    NameOrIdentifier.entityNavigationProperty(value, index, metadataContext) ||
    NameOrIdentifier.complexColProperty(value, index, metadataContext) ||
    NameOrIdentifier.complexProperty(value, index, metadataContext) ||
    NameOrIdentifier.primitiveColProperty(value, index, metadataContext) ||
    NameOrIdentifier.primitiveProperty(value, index, metadataContext) ||
    NameOrIdentifier.streamProperty(value, index, metadataContext);

  if (!token) {
    return;
  }
  const start = index;
  index = token.next;

  let navigation;
  switch (token.type) {
    case Lexer.TokenType.EntityCollectionNavigationProperty:
      navigation = collectionNavigation(value, index, token.metadata);
      delete token.metadata;
      break;
    case Lexer.TokenType.EntityNavigationProperty:
      navigation = singleNavigation(value, index, token.metadata);
      delete token.metadata;
      break;
    case Lexer.TokenType.ComplexCollectionProperty:
      navigation = collectionPath(value, index, token.metadata);
      delete token.metadata;
      break;
    case Lexer.TokenType.ComplexProperty:
      navigation = complexPath(value, index, token.metadata);
      delete token.metadata;
      break;
    case Lexer.TokenType.PrimitiveCollectionProperty:
      navigation = collectionPath(value, index, token.metadata);
      delete token.metadata;
      break;
    case Lexer.TokenType.PrimitiveKeyProperty:
    case Lexer.TokenType.PrimitiveProperty:
      navigation = singlePath(value, index, token.metadata);
      delete token.metadata;
      break;
    case Lexer.TokenType.StreamProperty:
      navigation = boundOperation(value, index, token.metadata);
      delete token.metadata;
      break;
  }

  if (navigation) {
    index = navigation.next;
  }

  return Lexer.tokenize(
    value,
    start,
    index,
    { path: token, navigation },
    Lexer.TokenType.PropertyPath,
    navigation
  );
}

export function collectionPath(
  value: SourceArray,
  index: number,
  metadataContext?: any
): Lexer.Token {
  return (
    Expressions.countExpr(value, index) ||
    boundOperation(value, index, true, metadataContext)
  );
}

export function singlePath(
  value: SourceArray,
  index: number,
  metadataContext?: any
): Lexer.Token {
  return (
    Expressions.valueExpr(value, index) ||
    boundOperation(value, index, false, metadataContext)
  );
}

export function complexPath(
  value: SourceArray,
  index: number,
  metadataContext?: any
): Lexer.Token {
  const start = index;
  let name, token;
  if (value[index] === 0x2f) {
    name = NameOrIdentifier.qualifiedComplexTypeName(
      value,
      index + 1,
      metadataContext
    );
    if (name) {
      index = name.next;
    }
  }

  if (value[index] === 0x2f) {
    token = propertyPath(value, index + 1, metadataContext);
    if (!token) {
      return;
    }
    index = token.next;
  } else {
    token = boundOperation(value, index, false, metadataContext);
  }

  if (!name && !token) {
    return;
  }

  return Lexer.tokenize(
    value,
    start,
    index,
    { name, path: token },
    Lexer.TokenType.ComplexPath,
    token
  );
}

export function boundOperation(
  value: SourceArray,
  index: number,
  isCollection: boolean,
  metadataContext?: any
): Lexer.Token {
  if (value[index] !== 0x2f) {
    return;
  }
  const start = index;
  index++;

  const operation =
    boundEntityColFuncCall(value, index, isCollection, metadataContext) ||
    boundEntityFuncCall(value, index, isCollection, metadataContext) ||
    boundComplexColFuncCall(value, index, isCollection, metadataContext) ||
    boundComplexFuncCall(value, index, isCollection, metadataContext) ||
    boundPrimitiveColFuncCall(value, index, isCollection, metadataContext) ||
    boundPrimitiveFuncCall(value, index, isCollection, metadataContext) ||
    boundActionCall(value, index, isCollection, metadataContext);
  if (!operation) {
    return;
  }
  index = operation.next;

  let name, navigation;
  switch (operation.type) {
    case Lexer.TokenType.BoundActionCall:
      break;
    case Lexer.TokenType.BoundEntityCollectionFunctionCall:
      navigation = collectionNavigation(
        value,
        index,
        operation.value.call.metadata
      );
      delete operation.metadata;
      break;
    case Lexer.TokenType.BoundEntityFunctionCall:
      navigation = singleNavigation(
        value,
        index,
        operation.value.call.metadata
      );
      delete operation.metadata;
      break;
    case Lexer.TokenType.BoundComplexCollectionFunctionCall:
      if (value[index] === 0x2f) {
        name = NameOrIdentifier.qualifiedComplexTypeName(
          value,
          index + 1,
          operation.value.call.metadata
        );
        if (name) {
          index = name.next;
        }
      }
      navigation = collectionPath(value, index, operation.value.call.metadata);
      delete operation.metadata;
      break;
    case Lexer.TokenType.BoundComplexFunctionCall:
      navigation = complexPath(value, index, operation.value.call.metadata);
      delete operation.metadata;
      break;
    case Lexer.TokenType.BoundPrimitiveCollectionFunctionCall:
      navigation = collectionPath(value, index, operation.value.call.metadata);
      delete operation.metadata;
      break;
    case Lexer.TokenType.BoundPrimitiveFunctionCall:
      navigation = singlePath(value, index, operation.value.call.metadata);
      delete operation.metadata;
      break;
  }

  if (navigation) {
    index = navigation.next;
  }

  return Lexer.tokenize(
    value,
    start,
    index,
    { operation, name, navigation },
    Lexer.TokenType.BoundOperation,
    navigation
  );
}

export function boundActionCall(
  value: SourceArray,
  index: number,
  isCollection: boolean,
  metadataContext?: any
): Lexer.Token {
  const namespaceNext = NameOrIdentifier.namespace(value, index);
  if (namespaceNext === index) {
    return;
  }
  const start = index;
  index = namespaceNext;

  if (value[index] !== 0x2e) {
    return;
  }
  index++;

  const action = NameOrIdentifier.action(
    value,
    index,
    isCollection,
    metadataContext
  );
  if (!action) {
    return;
  }
  action.value.namespace = Utils.stringify(value, start, namespaceNext);

  return Lexer.tokenize(
    value,
    start,
    action.next,
    action,
    Lexer.TokenType.BoundActionCall,
    action
  );
}

export function boundFunctionCall(
  value: SourceArray,
  index: number,
  odataFunction: Function,
  tokenType: Lexer.TokenType,
  isCollection: boolean,
  metadataContext?: any
): Lexer.Token {
  const namespaceNext = NameOrIdentifier.namespace(value, index);
  if (namespaceNext === index) {
    return;
  }
  const start = index;
  index = namespaceNext;

  if (value[index] !== 0x2e) {
    return;
  }
  index++;

  const call = odataFunction(value, index, isCollection, metadataContext);
  if (!call) {
    return;
  }
  call.value.namespace = Utils.stringify(value, start, namespaceNext);
  index = call.next;

  const params = functionParameters(value, index);
  if (!params) {
    return;
  }
  index = params.next;

  return Lexer.tokenize(value, start, index, { call, params }, tokenType, call);
}

export function boundEntityFuncCall(
  value: SourceArray,
  index: number,
  isCollection: boolean,
  metadataContext?: any
): Lexer.Token {
  return boundFunctionCall(
    value,
    index,
    NameOrIdentifier.entityFunction,
    Lexer.TokenType.BoundEntityFunctionCall,
    isCollection,
    metadataContext
  );
}
export function boundEntityColFuncCall(
  value: SourceArray,
  index: number,
  isCollection: boolean,
  metadataContext?: any
): Lexer.Token {
  return boundFunctionCall(
    value,
    index,
    NameOrIdentifier.entityColFunction,
    Lexer.TokenType.BoundEntityCollectionFunctionCall,
    isCollection,
    metadataContext
  );
}
export function boundComplexFuncCall(
  value: SourceArray,
  index: number,
  isCollection: boolean,
  metadataContext?: any
): Lexer.Token {
  return boundFunctionCall(
    value,
    index,
    NameOrIdentifier.complexFunction,
    Lexer.TokenType.BoundComplexFunctionCall,
    isCollection,
    metadataContext
  );
}
export function boundComplexColFuncCall(
  value: SourceArray,
  index: number,
  isCollection: boolean,
  metadataContext?: any
): Lexer.Token {
  return boundFunctionCall(
    value,
    index,
    NameOrIdentifier.complexColFunction,
    Lexer.TokenType.BoundComplexCollectionFunctionCall,
    isCollection,
    metadataContext
  );
}
export function boundPrimitiveFuncCall(
  value: SourceArray,
  index: number,
  isCollection: boolean,
  metadataContext?: any
): Lexer.Token {
  return boundFunctionCall(
    value,
    index,
    NameOrIdentifier.primitiveFunction,
    Lexer.TokenType.BoundPrimitiveFunctionCall,
    isCollection,
    metadataContext
  );
}
export function boundPrimitiveColFuncCall(
  value: SourceArray,
  index: number,
  isCollection: boolean,
  metadataContext?: any
): Lexer.Token {
  return boundFunctionCall(
    value,
    index,
    NameOrIdentifier.primitiveColFunction,
    Lexer.TokenType.BoundPrimitiveCollectionFunctionCall,
    isCollection,
    metadataContext
  );
}

export function actionImportCall(
  value: SourceArray,
  index: number,
  metadataContext?: any
): Lexer.Token {
  const action = NameOrIdentifier.actionImport(value, index, metadataContext);
  if (action) {
    return Lexer.tokenize(
      value,
      index,
      action.next,
      action,
      Lexer.TokenType.ActionImportCall,
      action
    );
  }
}

export function functionImportCall(
  value: SourceArray,
  index: number,
  metadataContext?: any
): Lexer.Token {
  const fnImport =
    NameOrIdentifier.entityFunctionImport(value, index, metadataContext) ||
    NameOrIdentifier.entityColFunctionImport(value, index, metadataContext) ||
    NameOrIdentifier.complexFunctionImport(value, index, metadataContext) ||
    NameOrIdentifier.complexColFunctionImport(value, index, metadataContext) ||
    NameOrIdentifier.primitiveFunctionImport(value, index, metadataContext) ||
    NameOrIdentifier.primitiveColFunctionImport(value, index, metadataContext);

  if (!fnImport) {
    return;
  }
  const start = index;
  index = fnImport.next;

  const params = functionParameters(value, index);
  if (!params) {
    return;
  }
  index = params.next;

  return Lexer.tokenize(
    value,
    start,
    index,
    { import: fnImport, params: params.value },
    <Lexer.TokenType>`${fnImport.type}Call`,
    fnImport
  );
}

export function functionParameters(
  value: SourceArray,
  index: number,
  metadataContext?: any
): Lexer.Token {
  const open = Lexer.OPEN(value, index);
  if (!open) {
    return;
  }
  const start = index;
  index = open;

  const params = [];
  let token = functionParameter(value, index);
  while (token) {
    params.push(token);
    index = token.next;

    const comma = Lexer.COMMA(value, index);
    if (comma) {
      index = comma;
      token = functionParameter(value, index);
      if (!token) {
        return;
      }
    } else {
      break;
    }
  }

  const close = Lexer.CLOSE(value, index);
  if (!close) {
    return;
  }
  index = close;

  return Lexer.tokenize(
    value,
    start,
    index,
    params,
    Lexer.TokenType.FunctionParameters
  );
}

export function functionParameter(
  value: SourceArray,
  index: number,
  metadataContext?: any
): Lexer.Token {
  const name = Expressions.parameterName(value, index);
  if (!name) {
    return;
  }
  const start = index;
  index = name.next;

  const eq = Lexer.EQ(value, index);
  if (!eq) {
    return;
  }
  index = eq;

  const token =
    Expressions.parameterAlias(value, index) ||
    PrimitiveLiteral.primitiveLiteral(value, index);

  if (!token) {
    return;
  }
  index = token.next;

  return Lexer.tokenize(
    value,
    start,
    index,
    { name, value: token },
    Lexer.TokenType.FunctionParameter
  );
}

export function crossjoin(
  value: SourceArray,
  index: number,
  metadataContext?: any
): Lexer.Token {
  if (!Utils.equals(value, index, '$crossjoin')) {
    return;
  }
  const start = index;
  index += 10;

  const open = Lexer.OPEN(value, index);
  if (!open) {
    return;
  }
  index = open;

  const names = [];
  let token = NameOrIdentifier.entitySetName(value, index, metadataContext);
  if (!token) {
    return;
  }

  while (token) {
    names.push(token);
    index = token.next;

    const comma = Lexer.COMMA(value, index);
    if (comma) {
      index = comma;
      token = NameOrIdentifier.entitySetName(value, index, metadataContext);
      if (!token) {
        return;
      }
    } else {
      break;
    }
  }

  const close = Lexer.CLOSE(value, index);
  if (!close) {
    return;
  }

  return Lexer.tokenize(
    value,
    start,
    index,
    { names },
    Lexer.TokenType.Crossjoin
  );
}

export function all(value: SourceArray, index: number): Lexer.Token {
  if (Utils.equals(value, index, '$all')) {
    return Lexer.tokenize(
      value,
      index,
      index + 4,
      '$all',
      Lexer.TokenType.AllResource
    );
  }
}
