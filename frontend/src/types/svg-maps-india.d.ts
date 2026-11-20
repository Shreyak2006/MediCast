declare module '@svg-maps/india' {
  type IndiaLocation = {
    id: string
    name: string
    path: string
  }

  const indiaMap: {
    label: string
    viewBox: string
    locations: IndiaLocation[]
  }

  export default indiaMap
}
