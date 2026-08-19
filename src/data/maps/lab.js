import { n, e } from './_schema.js'

export default {
  id: 'lab',
  name: 'The Lab',
  viewBox: '0 0 1000 700',
  image: '/maps/lab.jpg',
  nodes: [
    n('lab_spawn', 'Lab Entrance Spawn', 'spawn', 50, 90, 3, 'pmc', 'Labs Access Keycard'),
    n('lab_testchamber', 'Test Chamber', 'landmark', 50, 55, 7, 'shared'),
    n('lab_manager', "Manager's Office", 'landmark', 35, 40, 6, 'shared'),
    n('lab_yellow', 'Yellow Sector', 'landmark', 65, 35, 8, 'shared'),
    n('lab_redsector', 'Red Sector', 'landmark', 45, 20, 9, 'shared'),
    n('lab_ext_elevator', 'Main Elevator', 'extract', 50, 60, 3, 'pmc', null),
    n('lab_ext_parking', 'Parking Gate', 'extract', 20, 15, 5, 'pmc', 'Lab. Parking Gate Switch Key'),
    n('lab_ext_cargo', 'Cargo Elevator', 'extract', 75, 10, 6, 'pmc', 'Lab. Cargo Elevator Access Card'),
    n('lab_ext_sewage', 'Sewage Gate', 'extract', 30, 75, 4, 'pmc', null),
  ],
  edges: [
    e('lab_spawn', 'lab_testchamber', 4),
    e('lab_spawn', 'lab_ext_sewage', 3),
    e('lab_testchamber', 'lab_ext_elevator', 2),
    e('lab_testchamber', 'lab_manager', 4),
    e('lab_manager', 'lab_yellow', 4),
    e('lab_manager', 'lab_redsector', 5),
    e('lab_redsector', 'lab_ext_parking', 4),
    e('lab_yellow', 'lab_ext_cargo', 5),
    e('lab_manager', 'lab_ext_sewage', 5),
  ],
}
