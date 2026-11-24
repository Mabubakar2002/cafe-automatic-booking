-- Optional, repeatable example menu seed. Does not touch orders, customers, or stock.

insert into public.categories (name, sort)
select seed.name, seed.sort
from (values
  ('Hot Coffee & Teas', 1),
  ('Cold Beverages & Frappes', 2),
  ('Burgers & Sandwiches', 3),
  ('Snacks & Appetizers', 4),
  ('Desserts & Bakery', 5),
  ('Offers & Deals', 6)
) as seed(name, sort)
where not exists (
  select 1 from public.categories c where c.name = seed.name
);

with seed(category_name, name, description, price, image_url) as (
  values
    ('Hot Coffee & Teas', 'Artisan Espresso', 'Rich, bold, and intense concentrated double shot of Italian roast.', 260, 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600&q=80'),
    ('Hot Coffee & Teas', 'Creamy Cappuccino', 'Equal parts espresso, silky steamed milk, and velvety foam with cocoa.', 380, 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&q=80'),
    ('Hot Coffee & Teas', 'Caramel Macchiato', 'Steamed milk stained with espresso, vanilla syrup and buttery caramel sauce.', 440, 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600&q=80'),
    ('Hot Coffee & Teas', 'Spanish Latte', 'Velvety condensed milk blended with double espresso and micro-foam.', 460, 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&q=80'),
    ('Hot Coffee & Teas', 'Belgian Hot Chocolate', 'Rich dark Belgian melted chocolate folded with creamy whole milk.', 420, 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=600&q=80'),
    ('Cold Beverages & Frappes', 'Iced Vanilla Latte', 'Cold espresso over iced milk with a touch of Madagascar vanilla.', 470, 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&q=80'),
    ('Cold Beverages & Frappes', 'Chocolate Mocha Frappe', 'Thick blended iced espresso with dark chocolate chips & whipped cream.', 520, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&q=80'),
    ('Cold Beverages & Frappes', 'Peach Iced Tea', 'Chilled freshly brewed black tea with juicy peach extract and lemon slices.', 360, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=80'),
    ('Cold Beverages & Frappes', 'Mint Lemonade Fizz', 'Crushed garden mint, freshly squeezed lemons, and bubbly sparkling soda.', 340, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&q=80'),
    ('Burgers & Sandwiches', 'Crispy Zinger Burger', 'Hand-breaded crunchy chicken fillet, fiery garlic mayo, iceberg lettuce.', 590, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80'),
    ('Burgers & Sandwiches', 'Smash Beef Cheeseburger', 'Twin beef smashed patties, melted cheddar, caramelized onions, brioche bun.', 680, 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&q=80'),
    ('Burgers & Sandwiches', 'Artisan Club Sandwich', '3-layer toasted bread with shredded chicken, fried egg, cheese & herb mayo.', 520, 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=80'),
    ('Snacks & Appetizers', 'Loaded Cheesy Fries', 'Crispy golden fries smothered with cheddar cheese sauce & jalapenos.', 430, 'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=600&q=80'),
    ('Snacks & Appetizers', 'Crispy Honey BBQ Wings', '6 pieces of golden wings tossed in smoky honey barbecue sauce.', 540, 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&q=80'),
    ('Desserts & Bakery', 'Sizzling Molten Lava', 'Warm chocolate cake with flowing molten center served with vanilla scoop.', 490, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&q=80'),
    ('Desserts & Bakery', 'Lotus Biscoff Cheesecake', 'Creamy New York cheesecake smothered in rich caramelized Lotus spread.', 550, 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&q=80'),
    ('Desserts & Bakery', 'Fudge Brownie with Ice Cream', 'Warm chocolate fudge brownie loaded with walnuts and dark chocolate fudge.', 380, 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=600&q=80'),
    ('Offers & Deals', 'Zinger Burger Combo', 'Crispy zinger burger with loaded fries and a chilled soft drink.', 790, 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=600&q=80'),
    ('Offers & Deals', 'Family Burger Feast', 'Two beef burgers, two crispy fries and two soft drinks.', 1490, 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600&q=80'),
    ('Offers & Deals', 'Coffee & Dessert Deal', 'Any signature latte paired with a Lotus cheesecake or brownie.', 850, 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80')
)
insert into public.menu_items (category_id, name, description, price, image_url, is_available)
select c.id, seed.name, seed.description, seed.price, seed.image_url, true
from seed
join public.categories c on c.name = seed.category_name
where not exists (
  select 1 from public.menu_items mi
  where mi.category_id = c.id and mi.name = seed.name
);

insert into public.modifiers (name, price)
select seed.name, seed.price
from (values
  ('Extra Cheddar Cheese', 90),
  ('Extra Espresso Shot', 120),
  ('Caramel Drizzle', 80),
  ('Vanilla Ice Cream Scoop', 110)
) as seed(name, price)
where not exists (
  select 1 from public.modifiers m where m.name = seed.name
);

with seed(item_name, modifier_name) as (
  values
    ('Artisan Espresso', 'Extra Espresso Shot'),
    ('Creamy Cappuccino', 'Extra Espresso Shot'),
    ('Creamy Cappuccino', 'Caramel Drizzle'),
    ('Caramel Macchiato', 'Extra Espresso Shot'),
    ('Iced Vanilla Latte', 'Extra Espresso Shot'),
    ('Iced Vanilla Latte', 'Caramel Drizzle'),
    ('Crispy Zinger Burger', 'Extra Cheddar Cheese'),
    ('Smash Beef Cheeseburger', 'Extra Cheddar Cheese'),
    ('Loaded Cheesy Fries', 'Extra Cheddar Cheese'),
    ('Sizzling Molten Lava', 'Vanilla Ice Cream Scoop'),
    ('Fudge Brownie with Ice Cream', 'Vanilla Ice Cream Scoop')
)
insert into public.menu_item_modifiers (menu_item_id, modifier_id)
select mi.id, m.id
from seed
join public.menu_items mi on mi.name = seed.item_name
join public.modifiers m on m.name = seed.modifier_name
where not exists (
  select 1 from public.menu_item_modifiers mim
  where mim.menu_item_id = mi.id and mim.modifier_id = m.id
);
