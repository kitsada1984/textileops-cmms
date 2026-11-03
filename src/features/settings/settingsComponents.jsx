import Card from '../../components/ui/Card'

export const TABLES = [
  ['machines','เครื่องจักร'], ['cylinders','กระบอก'], ['workorders','ใบสั่งงาน'],
  ['pmplans','แผน PM'], ['spareparts','อะไหล่'], ['purchaseorders','ใบสั่งซื้อ'],
  ['stocktransactions','เคลื่อนไหวสต็อก'], ['auditlogs','บันทึกระบบ'], ['appconfigs','ตั้งค่าแอป'],
]

export function SectionCard({ icon: Icon, title, children }) {
  return (
    <Card>
      <Card.Header>
        <Card.Title icon={Icon}>{title}</Card.Title>
      </Card.Header>
      <Card.Body>{children}</Card.Body>
    </Card>
  )
}
