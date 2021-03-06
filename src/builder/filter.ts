import join from '@newdash/newdash/join';
import { Edm } from '@odata/metadata';
import { convertPrimitiveValueToString, ODataVersion } from './types';

export enum ExprOperator {
  eq = 'eq',
  ne = 'ne',
  gt = 'gt',
  lt = 'lt',
  ge = 'ge',
  le = 'le'
}

type FieldExpr = {
  op: ExprOperator;
  value: any;
};

type FieldExprMappings = {
  [key: string]: FieldExpr[];
};

/**
 * @private
 * @internal
 */
class ODataFieldExpr {
  constructor(
    filter: ODataFilter,
    fieldName: string,
    mapping: FieldExprMappings
  ) {
    this._exprMappings = mapping;
    this._fieldName = fieldName;
    this._filter = filter;
    // initialize
    if (this._getFieldExprs() == undefined) {
      this._exprMappings[this._fieldName] = [];
    }
  }

  private _filter: ODataFilter;

  private _fieldName: string;

  private _exprMappings: FieldExprMappings;

  private _getFieldExprs() {
    return this._exprMappings[this._fieldName];
  }

  private _addExpr(op: ExprOperator, value: any) {
    if (value === null) {
      this._getFieldExprs().push({ op, value: 'null' });
      return;
    }

    switch (typeof value) {
      case 'number':
      case 'boolean':
      case 'string':
      case 'object':
        this._getFieldExprs().push({ op, value });
        break;
      case 'undefined':
        throw new Error(
          `You must set value in odata filter eq/ne/gt/ge/ne/nt ...`
        );
      default:
        throw new Error(
          `Not support typeof ${typeof value}: ${value} in odata filter eq/ne/gt/ge/ne/nt ...`
        );
    }
  }

  /**
   * equal
   * @param value
   */
  eq(value: number | string | Edm.PrimitiveTypeValue): ODataFilter {
    this._addExpr(ExprOperator.eq, value);
    return this._filter;
  }

  /**
   * not equal
   * @param value
   */
  ne(value: number | string | Edm.PrimitiveTypeValue): ODataFilter {
    this._addExpr(ExprOperator.ne, value);
    return this._filter;
  }

  eqString(value: string): ODataFilter {
    this._addExpr(ExprOperator.eq, `'${value}'`);
    return this._filter;
  }

  neString(value: string): ODataFilter {
    this._addExpr(ExprOperator.ne, `'${value}'`);
    return this._filter;
  }

  /**
   * greater or equal
   * @param value
   */
  ge(value: number | string | Edm.PrimitiveTypeValue): ODataFilter {
    this._addExpr(ExprOperator.ge, value);
    return this._filter;
  }

  /**
   * greater than
   * @param value
   */
  gt(value: number | string | Edm.PrimitiveTypeValue): ODataFilter {
    this._addExpr(ExprOperator.gt, value);
    return this._filter;
  }

  /**
   * less or equal
   * @param value
   */
  le(value: number | string | Edm.PrimitiveTypeValue): ODataFilter {
    this._addExpr(ExprOperator.le, value);
    return this._filter;
  }

  /**
   * less than
   * @param value
   */
  lt(value: number | string | Edm.PrimitiveTypeValue): ODataFilter {
    this._addExpr(ExprOperator.lt, value);
    return this._filter;
  }

  /**
   * match any value in an array
   *
   * @param values
   */
  in(
    values: Array<number | string | Edm.PrimitiveTypeValue> = []
  ): ODataFilter {
    if (values.length > 0) {
      values.forEach((value) => {
        this.eq(value);
      });
    }
    return this._filter;
  }

  /**
   * filter by value range
   *
   * @param low
   * @param max
   * @param includeBoundary
   */
  between(low: any, max: any, includeBoundary = true): ODataFilter {
    if (low == undefined || max == undefined) {
      throw new Error('You must give out the start and end value');
    }
    if (includeBoundary) {
      this.ge(low);
      this.le(max);
    } else {
      this.gt(low);
      this.lt(max);
    }
    return this._filter;
  }
}

/**
 * OData filter builder
 */
export class ODataFilter<T = any> {
  static New<E>(obj?: Partial<E>): ODataFilter {
    return new ODataFilter<E>(obj as E);
  }

  constructor(obj?: T) {
    if (obj != undefined && typeof obj == 'object') {
      Object.entries(obj).forEach(([prop, value]) => {
        this.field(prop as any).eq(value);
      });
    }
  }

  private _fieldExprMappings: FieldExprMappings = {};

  /**
   * getExprMapping
   *
   * @internal
   * @private
   */
  private getExprMapping(): FieldExprMappings {
    return this._fieldExprMappings;
  }

  /**
   * @param name filed name
   */
  field(name: keyof T): ODataFieldExpr {
    return new ODataFieldExpr(this, name as string, this.getExprMapping());
  }

  public toString(version: ODataVersion = 'v4'): string {
    return this.build(version);
  }

  private _buildExprLit(value: any, version: ODataVersion = 'v4') {
    if (value === null) {
      return 'null';
    }

    switch (typeof value) {
      case 'number':
      case 'boolean':
        return `${value}`;
      case 'string':
        if (value.startsWith("'") || value.startsWith('datetime')) {
          return value;
        }
        return `'${value}'`;
      case 'object':
        if (value instanceof Edm.PrimitiveTypeValue) {
          return convertPrimitiveValueToString(value, version);
        }
        throw new Error(
          `Not support object ${
            value?.constructor?.name || typeof value
          } in odata filter eq/ne/gt/ge/ne/nt ...`
        );

      case 'undefined':
        throw new Error(
          `You must set value in odata filter eq/ne/gt/ge/ne/nt ...`
        );
      default:
        throw new Error(
          `Not support typeof ${typeof value}: ${value} in odata filter eq/ne/gt/ge/ne/nt ...`
        );
    }
  }

  protected _buildFieldExprString(
    field: string,
    version: ODataVersion = 'v4'
  ): string {
    const exprs = this.getExprMapping()[field];
    if (exprs.length > 0) {
      if (exprs.filter((expr) => expr.op == ExprOperator.eq).length == 0) {
        return `(${join(
          exprs.map(
            ({ op, value }) =>
              `${field} ${op} ${this._buildExprLit(value, version)}`
          ),
          ' and '
        )})`;
      }
      return `(${join(
        exprs.map(
          ({ op, value }) =>
            `${field} ${op} ${this._buildExprLit(value, version)}`
        ),
        ' or '
      )})`;
    }
    return '';
  }

  public build(version: ODataVersion = 'v4'): string {
    let _rt = '';
    _rt = join(
      // join all fields exprs string
      Object.entries(this.getExprMapping()).map(([fieldName, exprs]) => {
        switch (exprs.length) {
          // if one field expr mapping array is empty
          case 0:
            return '';
          // only have one expr
          case 1:
            const { op, value } = exprs[0];
            return `${fieldName} ${op} ${this._buildExprLit(value, version)}`;
          default:
            // multi exprs
            return this._buildFieldExprString(fieldName, version);
        }
      }),
      ' and '
    );
    return _rt;
  }
}
