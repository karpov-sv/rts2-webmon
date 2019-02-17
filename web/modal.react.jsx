class DeviceModal extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.state = {show: false};
    }

    render() {
        var varlist = [];

        for(var key in this.props.variables) {
            if(this.props.variables.hasOwnProperty(key)) {
                var item = <tr key={key}><td>{key}</td><td>{JSON.stringify(this.props.variables[key])}</td></tr>;
                varlist.push(item);
            }
        }

        return (
            <>
              <span onClick={() => this.setState({show: true})}>
                {this.props.activator}
              </span>

              <Modal bsSize="lg" show={this.state.show} onHide={() => this.setState({show: false})}>
                <Modal.Header closeButton>
                  <Modal.Title>{this.props.title}</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{'maxHeight': 'calc(100vh - 210px)', 'overflowY': 'auto', 'overflowX': 'auto', 'padding': 0}}>
                  <Table striped bordered hover size="sm">
                    <tbody>
                      {varlist}
                    </tbody>
                  </Table>
                </Modal.Body>
                <Modal.Footer>
                  <Button bsStyle="default" onClick={() => this.setState({show: false})}>Close</Button>
                </Modal.Footer>
              </Modal>
            </>
        );
    }
}
