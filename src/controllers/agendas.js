const knex = require('../connection')

const { differenceInDays, addDays, format, isSameDay} = require('date-fns')


const getDateRange = (startDate, endDate) => {
  const days = differenceInDays(endDate, startDate)

  return [...Array(days + 1).keys()].map(i => format(addDays(startDate, i), 'MM/dd/yyyy'))
}

const newAgenda = async (req, res) => {
    const {agenda_name, agenda_type, procedure_type, start_time, end_time, date, slots_available, additional_slots, is_active} = req.body;

    try {
        if(start_time >= end_time){
            return res.status(400).json({message: 'Escolha um horário válido para a agenda.'})
        }

        if( new Date(date).getUTCFullYear() < new Date().getUTCFullYear() ||
            new Date(date).getUTCMonth() < new Date().getUTCMonth() ||
            new Date(date).getUTCDate() < new Date().getUTCDate() ){
            return res.status(400).json({message: 'Não é possivel cadastrar agendas em datas passadas'})
        }

        const newAgenda = await knex('agendas').insert({
            agenda_name,
            agenda_type,
            procedure_type, 
            start_time, 
            end_time, 
            date, 
            slots_available, 
            additional_slots, 
            is_active,
            user_id: req.user.id
        }).returning('*')
        return res.status(200).json(newAgenda)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

const showAgendas = async (req, res) => {
    const { q = '', status = '', dates = [] } = req.query
    const queryLowered = q.toLowerCase()
    try {
        const allAgendas = await knex('agendas')


        const filteredData = allAgendas.filter(agenda => {
            const agendaDate = new Date(agenda.date);
          
            if (dates.length > 0) {
              const [start, end] = dates;
              const range = getDateRange(new Date(start), new Date(end));
              if (!range.some(date => isSameDay(new Date(date), agendaDate))) {
                return false;
              }
            }
          
            return (
              (agenda.procedure_type.toLowerCase().includes(queryLowered) ||
                agenda.agenda_name.toLowerCase().includes(queryLowered) ||
                String(agenda.agenda_id).toLowerCase().includes(queryLowered) ||
                String(agenda.start_time).toLowerCase().includes(queryLowered) ||
                String(agenda.slots_available).toLowerCase().includes(queryLowered)) &&
              String(agenda.is_active) === (status.toLowerCase() || String(agenda.is_active))
            );
          });

        const resp = {
            params: req.query,
            allData: allAgendas,
            invoices: filteredData,
            total: filteredData.length
        }


        return res.status(200).json(resp)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

const insertPatient = async (req, res) => {
  const { agenda_id, patient_id, appointment_time } = req.body

  const scheduledPatients = await knex('agenda_patient as ap')
  .select('p.*')
  .join('patients as p', 'ap.patient_id', 'p.id')
  .where('ap.agenda_id', agenda_id)

  const numberOfPatients = scheduledPatients.length + 1
  
  const slots_available = await knex.select('slots_available').from('agendas').where('agenda_id', agenda_id)

  try {

    if (numberOfPatients > slots_available[0].slots_available){
      return res.status(401).json({message: 'Esta agenda está cheia!'})
    }

    const insertedPatitent = await knex('agenda_patient').insert({
      agenda_id,
      patient_id, 
      appointment_time
    }).returning('*')

    return res.status(200).json(insertedPatitent)
  } catch (error) {
    return res.status(500).json({message: error.message})
  }
}

const showAgendaPatients = async (req, res) => {
  const { id } = req.params

  await knex('agenda_patient as ap')
  .select('p.*')
  .join('patients as p', 'ap.patient_id', 'p.id')
  .where('ap.agenda_id', id)
  .then((results) => {
    return res.status(200).json(results)
  })
  .catch((err) => {
    return res.status(500).json({message: err})
  })
  .finally(() => {
    // Feche a conexão com o banco de dados quando terminar
    knex.destroy();
  });

}


module.exports = { 
    newAgenda,
    showAgendas,
    insertPatient,
    showAgendaPatients
 }