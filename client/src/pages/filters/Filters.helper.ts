interface DropdownFilter {
	displayName: string;
	filterOptionsKey: keyof FilterOptions;
	filterKey: FilterKeyMap;
}

export interface FilterOption {
	value: string;
	label: string;
}

export interface FilterOptions {
	typyStrechy: FilterOption[];
	materialyFasady: FilterOption[];
	materialyInterieru: FilterOption[];
	stavy: FilterOption[];
	obdobia: FilterOption[];
}

export interface BuildingFilters {
	rokVystavby?: string;
	rokVystavbyOd?: string;
	rokVystavbyDo?: string;
	typStrechy?: string;
	materialFasady?: string;
	materialInterieru?: string;
	aktualnyStav?: string;
	obdobie?: string;
}

export const FilterKeyMap = {
	rokVystavby: 'rokVystavby',
	rokVystavbyOd: 'rokVystavbyOd',
	rokVystavbyDo: 'rokVystavbyDo',
	typStrechy: 'typStrechy',
	materialFasady: 'materialFasady',
	materialInterieru: 'materialInterieru',
	obdobie: 'obdobie',
	aktualnyStav: 'aktualnyStav',
} as const;

export type FilterKeyMap = (typeof FilterKeyMap)[keyof typeof FilterKeyMap];

export const DropdownFilters: DropdownFilter[] = [
	{
		filterKey: FilterKeyMap.typStrechy,
		displayName: 'Typ strechy',
		filterOptionsKey: 'typyStrechy',
	},
	{
		filterKey: FilterKeyMap.materialFasady,
		displayName: 'Materiál fasády',
		filterOptionsKey: 'materialyFasady',
	},
	{
		filterKey: FilterKeyMap.materialInterieru,
		displayName: 'Materiál interiéru',
		filterOptionsKey: 'materialyInterieru',
	},
	{
		filterKey: FilterKeyMap.aktualnyStav,
		displayName: 'Stav',
		filterOptionsKey: 'stavy',
	},
];
