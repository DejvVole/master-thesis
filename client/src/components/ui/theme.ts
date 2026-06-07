import {
	createSystem,
	defaultConfig,
	defineConfig,
	defineRecipe,
	defineSlotRecipe,
} from '@chakra-ui/react';

const buttonRecipe = defineRecipe({
	base: {
		fontWeight: '600',
		borderRadius: 'md',
		_focusVisible: { boxShadow: '0 0 0 4px var(--chakra-colors-focus-ring)' },
	},
	variants: {
		variant: {
			solid: {
				bg: 'action.primary',
				color: 'action.onPrimary',
				_hover: { bg: 'action.primaryHover' },
				_active: { bg: 'action.primaryPress' },
				_disabled: {
					opacity: 0.5,
				},
			},
			outline: {
				borderColor: 'border.primary',
				_hover: { bg: 'action.secondaryHover', borderColor: 'transparent' },
				_disabled: { bg: 'border.default', color: 'text.subtle', opacity: 1 },
			},
			ghost: {
				bg: 'transparent',
				color: 'text.primary',
				_hover: { bg: 'action.secondaryHover' },
			},
		},
	},
	defaultVariants: {
		variant: 'solid',
	},
});

const inputRecipe = defineSlotRecipe({
	slots: ['root', 'field', 'element'],
	variants: {
		variant: {
			filledSoft: {
				field: {
					bg: 'bg.surface',
					border: '1px solid',
					borderColor: 'border.default',
					color: 'text.primary',
					_placeholder: { color: 'text.subtle' },
					_hover: { borderColor: 'border.strong' },
					_focusVisible: {
						borderColor: 'action.primary',
						boxShadow: '0 0 0 4px var(--chakra-colors-focus-ring)',
					},
				},
			},
		},
	},
	defaultVariants: {
		variant: 'filledSoft',
	},
});

const config = defineConfig({
	globalCss: {
		'html, body': {
			bg: 'bg.canvas',
			color: 'text.primary',
		},
	},
	theme: {
		tokens: {
			colors: {
				parchment: {
					50: { value: '#FAF9F7' },
					100: { value: '#F3ECE3' },
					200: { value: '#EFE4D8' },
					300: { value: '#E6D8CC' },
					400: { value: '#D6C2B1' },
					900: { value: '#2F2A24' },
				},
				patina: {
					100: { value: '#6fa8a12e' },
					400: { value: '#6FA8A1' },
					500: { value: '#5E988F' },
					600: { value: '#4F857C' },
					700: { value: '#3E7A73' },
				},
				ink: {
					900: { value: '#2F2A24' },
					800: { value: '#2f2a24ae' },
					700: { value: '#6B6158' },
					500: { value: '#8A7F74' },
				},
				gray: {
					300: { value: '#D1D1D1' },
					400: { value: '#B3B3B3' },
					500: { value: '#9B9B9B' },
				},
			},
		},

		semanticTokens: {
			colors: {
				'bg.canvas': { value: '#f8f8f8' },
				'bg.surface': { value: 'white' },
				'bg.surface2': { value: '{colors.parchment.100}' },
				'bg.surface3': { value: '{colors.parchment.200}' },

				'bg.dropdown': { value: '{colors.patina.100}' },

				'text.primary': { value: '{colors.ink.900}' },
				'text.secondary': { value: '{colors.ink.800}' },
				'text.muted': { value: '{colors.ink.700}' },
				'text.subtle': { value: '{colors.ink.500}' },

				'border.primary': { value: '{colors.gray.300}' },
				'border.action': { value: '{colors.patina.400}' },
				'border.default': { value: '{colors.parchment.300}' },
				'border.strong': { value: '{colors.gray.400}' },

				'action.primary': { value: '{colors.patina.400}' },
				'action.primaryHover': { value: '{colors.patina.500}' },
				'action.primaryPress': { value: '{colors.patina.600}' },
				'action.onPrimary': { value: 'white' },

				'action.secondary': { value: '#E7D2C4' },
				'action.secondaryHover': { value: '#6fa8a11f' },
				'action.onSecondary': { value: '{colors.ink.900}' },

				'focus-ring': { value: 'rgba(47,42,36,0.18)' },

				'color-error': { value: '#a6192e' },
				'color-success': { value: '#04b34f' },
				'color-warning': { value: '#ff9900' },
				'color-info': { value: '#0057b8' },
			},
		},

		recipes: {
			button: buttonRecipe,
		},
		slotRecipes: {
			input: inputRecipe,
		},
	},
});

export const system = createSystem(defaultConfig, config);
