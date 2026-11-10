import {
  IconApple, IconArrowLeft, IconAvocado, IconBaguette, IconBasket, IconBath, IconBattery2, IconBeer, IconBolt, IconBottle, IconBowl,
  IconBowlChopsticks, IconBowlSpoon, IconChartPie, IconCooker, IconEggFried, IconCamper, IconBread, IconBulb, IconBurger, IconCalendarEvent, IconCandy, IconCarrot, IconChefHat, IconCheese,
  IconCherry, IconChevronDown, IconCheck, IconCopy, IconFileImport, IconPencil, IconClock, IconHeart, IconHistory, IconLink, IconSearch, IconStar, IconUsers, IconMeatOff, IconPlant, IconMilkOff, IconWheatOff, IconFeather, IconFlame, IconFridge, IconMinus, IconCamera, IconX, IconChevronLeft, IconChevronRight, IconCoffee, IconCookie, IconCup, IconDental, IconDroplet, IconEgg, IconFish, IconFolder, IconGlassChampagne, IconGlassFull,
  IconHammer, IconHome, IconIceCream2, IconLeaf, IconLemon2, IconMeat, IconMelon, IconMilk, IconMug, IconMushroom, IconNut, IconPackage, IconPhoto,
  IconPaint, IconPepper, IconPizza, IconPlant2, IconPlus, IconRazor, IconSalad, IconSettings, IconSalt, IconSausage, IconSeeding, IconShoppingBag,
  IconAlarm, IconListDetails, IconShoppingCart, IconSnowflake, IconSoup, IconSpray, IconToiletPaper, IconTool, IconTrash, IconWashMachine, IconWheat,
} from '@tabler/icons-react'

// Le jeu d'icônes de l'app (Tabler, en contour). Une icône prend la couleur du texte
// qui l'entoure : le contraste est donc celui du texte, sur toutes les couleurs.
const ICONS = {
  // Fonctionnalités
  home: IconHome, shopping: IconShoppingCart, calendar: IconCalendarEvent, recipes: IconChefHat, works: IconHammer, documents: IconFolder, photos: IconPhoto,
  // Fruits et légumes
  apple: IconApple, lemon: IconLemon2, cherry: IconCherry, melon: IconMelon, avocado: IconAvocado, carrot: IconCarrot,
  pepper: IconPepper, mushroom: IconMushroom, salad: IconSalad, leaf: IconLeaf, herbs: IconPlant2, sprout: IconSeeding,
  // Boulangerie, crèmerie
  wheat: IconWheat, bread: IconBread, baguette: IconBaguette, burger: IconBurger, cheese: IconCheese, milk: IconMilk, egg: IconEgg,
  // Viandes et poissons
  meat: IconMeat, sausage: IconSausage, fish: IconFish,
  // Épicerie
  bowl: IconBowl, noodles: IconBowlChopsticks, soup: IconSoup, salt: IconSalt, bottle: IconBottle, nut: IconNut,
  cookie: IconCookie, candy: IconCandy, coffee: IconCoffee, tea: IconMug,
  // Surgelés
  iceCream: IconIceCream2, pizza: IconPizza, frozen: IconSnowflake,
  // Boissons
  water: IconDroplet, cup: IconCup, beer: IconBeer, wine: IconGlassFull, champagne: IconGlassChampagne,
  // Hygiène et entretien
  toiletPaper: IconToiletPaper, dental: IconDental, razor: IconRazor, bath: IconBath, laundry: IconWashMachine, spray: IconSpray, trash: IconTrash,
  // Bricolage
  bulb: IconBulb, battery: IconBattery2, bolt: IconBolt, paint: IconPaint, package: IconPackage, tool: IconTool,
  // Actions
  plus: IconPlus, settings: IconSettings, chevronDown: IconChevronDown, chevronLeft: IconChevronLeft, chevronRight: IconChevronRight,
  arrowLeft: IconArrowLeft, check: IconCheck, copy: IconCopy, import: IconFileImport, pencil: IconPencil, close: IconX, search: IconSearch, link: IconLink,
  // Recettes
  timer: IconAlarm, list: IconListDetails, star: IconStar, heart: IconHeart, clock: IconClock, history: IconHistory, users: IconUsers, minus: IconMinus, camera: IconCamera,
  // Types de plats
  bowlSpoon: IconBowlSpoon, pie: IconChartPie, cooker: IconCooker, eggFried: IconEggFried,
  // Labels de recettes
  meatOff: IconMeatOff, plant: IconPlant, milkOff: IconMilkOff, wheatOff: IconWheatOff, feather: IconFeather, flame: IconFlame, fridge: IconFridge, camper: IconCamper,
  // Par défaut
  basket: IconBasket, bag: IconShoppingBag,
} as const

export type IconName = keyof typeof ICONS

export default function Icon({ name, size = 24, className }: { name: IconName; size?: number; className?: string }) {
  const Component = ICONS[name]
  return <Component size={size} stroke={1.75} className={className} aria-hidden="true" />
}
