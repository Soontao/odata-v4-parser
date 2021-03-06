import { Edm } from '@odata/metadata';

export type ODataVersion = 'v2' | 'v4';

/**
 *
 * @param value primitive literal value
 * @returns the string representation
 */
export function convertPrimitiveValueToString(
  value: Edm.PrimitiveTypeValue,
  version: ODataVersion = 'v4'
) {
  if (value?.getValue?.() === null) {
    return 'null';
  }

  if (value?.getValue?.() !== undefined) {
    switch (value?.getType?.()) {
      case Edm.Int16:
      case Edm.Int32:
      case Edm.Int64:
      case Edm.Guid:
      case Edm.Double:
      case Edm.Decimal:
      case Edm.Byte:
      case Edm.SByte:
      case Edm.Single:
        return String(value.getValue());
      case Edm.Boolean:
        return String(value.getValue());
      case Edm.Binary:
        const vB = value.getValue();
        if (vB instanceof Buffer) {
          return `binary'${vB.toString('base64')}'`;
        }
        return String(vB);
      case Edm.String:
        return `'${value.getValue()}'`;
      case Edm.Duration:
        // TODO integrate with some other duration lib
        return value.getValue();
      case Edm.DateTime:
        let vd = value.getValue();
        if (typeof vd === 'string') {
          vd = new Date(vd);
        }
        if (version === 'v2') {
          return `datetime'${vd.toISOString()}'`;
        }
        throw new Error("OData V4 is not support 'Edm.DateTime' values");
      case Edm.DateTimeOffset:
        let v1 = value.getValue();
        if (typeof v1 === 'string') {
          v1 = new Date(v1);
        }
        if (version === 'v2') {
          return `datetimeoffset'${v1.toISOString()}'`;
        }
        return v1.toISOString();
      case Edm.Date:
        const v2 = value.getValue();
        if (v2 instanceof Date) {
          return `${v2.getFullYear()}-${v2.getMonth() + 1}-${v2.getDate()}`;
        }
        return v2;
      case Edm.Geography:
      case Edm.GeographyPoint:
      case Edm.GeographyLineString:
      case Edm.GeographyPolygon:
      case Edm.GeographyMultiPoint:
      case Edm.GeographyMultiLineString:
      case Edm.GeographyMultiPolygon:
      case Edm.GeographyCollection:
      case Edm.Geometry:
      case Edm.GeometryPoint:
      case Edm.GeometryLineString:
      case Edm.GeometryPolygon:
      case Edm.GeometryMultiPoint:
      case Edm.GeometryMultiLineString:
      case Edm.GeometryMultiPolygon:
      case Edm.GeometryCollection:
        return String(value.getValue());
      default:
        throw new TypeError(`not support type '${value.getType()}'`);
    }
  }

  throw new Error("'undefined' value provided");
}
