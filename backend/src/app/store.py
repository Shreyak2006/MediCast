# In-memory stock keyed by medicine name. Resets when the server restarts.
inventory_data: dict[str, int] = {
    "TB medicines": 90,
    "Dengue medicines": 30,
}
