import { n, e } from './_schema.js'

export default {
  id: 'groundzero',
  name: 'Ground Zero',
  viewBox: '0 0 1000 700',
  image: '/maps/groundzero.jpg',
  nodes: [
    n('gz_spawn_south', 'Cordon Crossing Spawn', 'spawn', 50, 90, 2, 'pmc'),
    n('gz_spawn_scav', 'Scav Yotota Spawn', 'spawn', 25, 60, 2, 'scav'),
    n('gz_school', 'School', 'landmark', 45, 45, 8, 'shared'),
    n('gz_yotota', 'Yotota Point', 'landmark', 30, 55, 5, 'shared'),
    n('gz_klimovsk', 'Klimovsk Hostel', 'landmark', 60, 35, 6, 'shared'),
    n('gz_comms', 'Comms Tower', 'landmark', 55, 20, 7, 'shared'),
    n('gz_ext_tram', 'Tram Extract', 'extract', 65, 15, 3, 'pmc', null),
    n('gz_ext_sewer', 'Sewer Extract', 'extract', 35, 70, 3, 'pmc', null),
    n('gz_ext_radio', 'Radio Antenna Checkpoint', 'extract', 75, 40, 4, 'pmc', 'Checkpoint Access Pass'),
    n('gz_ext_school', 'School Backyard', 'extract', 40, 30, 5, 'scav', null),
  ],
  edges: [
    e('gz_spawn_south', 'gz_yotota', 4),
    e('gz_spawn_south', 'gz_ext_sewer', 3),
    e('gz_yotota', 'gz_school', 4),
    e('gz_school', 'gz_klimovsk', 4),
    e('gz_school', 'gz_ext_school', 3),
    e('gz_klimovsk', 'gz_comms', 4),
    e('gz_comms', 'gz_ext_tram', 3),
    e('gz_klimovsk', 'gz_ext_radio', 5),
    e('gz_spawn_scav', 'gz_yotota', 3),
    e('gz_spawn_scav', 'gz_ext_school', 5),
  ],
}
