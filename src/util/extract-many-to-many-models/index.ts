import type { DMMF } from '@prisma/generator-helper';
import { UnReadonlyDeep } from '../un-readonly-deep';

/*
Credit where credit is due:

This is heavily borrowed from prisma-kysely
https://github.com/valtyr/prisma-kysely/blob/main/src/helpers/generateImplicitManyToManyModels.ts

where it was heavily borrowed from prisma-dbml-generator
https://github.com/notiz-dev/prisma-dbml-generator/blob/752f89cf40257a9698913294b38843ac742f8345/src/generator/many-to-many-tables.ts
*/

const sorted = <T>(list: T[], sortFunction?: (a: T, b: T) => number) => {
  const newList = [...list];
  newList.sort(sortFunction);
  return newList;
};

const generateModels = (
  manyToManyFields: DMMF.Field[],
  models: DMMF.Model[],
  manyToManyTables: DMMF.Model[] = []
): DMMF.Model[] => {
  const manyFirst = manyToManyFields.shift();
  if (!manyFirst) {
    return manyToManyTables;
  }

  const manySecond = manyToManyFields.find(
    (field) => field.relationName === manyFirst.relationName
  );

  if (!manySecond) {
    return manyToManyTables;
  }

  manyToManyTables.push({
    dbName: `_${manyFirst.relationName}`,
    name: manyFirst.relationName || '',
    primaryKey: null,
    uniqueFields: [],
    uniqueIndexes: [],
    fields: generateJoinFields([manyFirst, manySecond], models),
  });

  return generateModels(
    manyToManyFields.filter((field) => field.relationName !== manyFirst.relationName),
    models,
    manyToManyTables
  );
};

const generateJoinFields = (
  fields: [DMMF.Field, DMMF.Field],
  models: DMMF.Model[]
): DMMF.Field[] => {
  const [A, B] = sorted(fields, (a, b) => a.type.localeCompare(b.type)) as UnReadonlyDeep<
    [DMMF.Field, DMMF.Field]
  >;

  const aTableName = B.type;
  const bTableName = A.type;

  const manyTableName = `${A.type}To${B.type}`;

  A.isList = true;
  A.type = `${bTableName}To${aTableName}`;
  A.relationName = `${aTableName}To${manyTableName}`;
  A.relationFromFields = [];
  A.relationToFields = [];

  B.isList = true;
  B.type = `${bTableName}To${aTableName}`;
  B.relationName = `${bTableName}To${manyTableName}`;
  A.relationFromFields = [];
  A.relationToFields = [];

  return [
    {
      name: `${aTableName}Id`,
      dbName: 'A',
      type: getJoinIdType(aTableName, models),
      kind: 'scalar',
      isRequired: true,
      isList: false,
      isUnique: false,
      isId: false,
      isReadOnly: true,
      hasDefaultValue: false,
    },
    {
      name: aTableName,
      type: aTableName,
      kind: 'object',
      isRequired: true,
      isList: false,
      isUnique: false,
      isId: false,
      isReadOnly: true,
      hasDefaultValue: false,
      relationName: `${aTableName}To${manyTableName}`,
      relationFromFields: [`${aTableName}Id`],
      relationToFields: [getJoinIdName(aTableName, models)],
    },
    {
      name: `${bTableName}Id`,
      dbName: 'B',
      type: getJoinIdType(bTableName, models),
      kind: 'scalar',
      isRequired: true,
      isList: false,
      isUnique: false,
      isId: false,
      isReadOnly: true,
      hasDefaultValue: false,
    },
    {
      name: bTableName,
      type: bTableName,
      kind: 'object',
      isRequired: true,
      isList: false,
      isUnique: false,
      isId: false,
      isReadOnly: true,
      hasDefaultValue: false,
      relationName: `${bTableName}To${manyTableName}`,
      relationFromFields: [`${bTableName}Id`],
      relationToFields: [getJoinIdName(bTableName, models)],
    },
  ];
};

const getJoinIdType = (typeName: string, models: DMMF.Model[]): string => {
  const joinedModel = models.find((m) => m.name === typeName);
  if (!joinedModel) {
    throw new Error('Could not find referenced model of many-to-many relation');
  }

  const idField = joinedModel.fields.find((f) => f.isId);
  if (!idField) throw new Error('No ID field on referenced model of many-to-many relation');

  return idField.type;
};

const getJoinIdName = (typeName: string, models: DMMF.Model[]): string => {
  const joinedModel = models.find((m) => m.name === typeName);
  if (!joinedModel) {
    throw new Error('Could not find referenced model of many-to-many relation');
  }

  const idField = joinedModel.fields.find((f) => f.isId);
  if (!idField) throw new Error('No ID field on referenced model of many-to-many relation');

  return idField.name;
};

const filterManyToManyRelationFields = (models: DMMF.Model[]) => {
  const fields = models.flatMap((model) => model.fields);

  const relationFields = (fields || []).filter(
    (field): field is DMMF.Field & Required<Pick<DMMF.Field, 'relationName'>> =>
      !!field.relationName
  );

  const nonManyToManyRelationNames = relationFields
    .filter((field) => !field.isList)
    .map((field) => field.relationName);

  const notManyToMany = new Set<string>(nonManyToManyRelationNames);

  return relationFields.filter((field) => !notManyToMany.has(field.relationName));
};

export const extractManyToManyModels = (models: DMMF.Model[]): DMMF.Model[] => {
  const manyToManyFields = filterManyToManyRelationFields(models);

  if (!manyToManyFields.length) return [];

  return generateModels(manyToManyFields, models, []);
};
