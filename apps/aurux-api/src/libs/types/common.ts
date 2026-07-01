import { ObjectId } from 'bson';

export interface T {
    [key: string]: any
}

export type NumericFieldKeys<T> = {
	[K in keyof T]-?: T[K] extends number ? K : never;
}[keyof T];

export interface StatisticModifier<T> {
	_id: ObjectId;
	targetKey: NumericFieldKeys<T>;
	modifier: number;
}
