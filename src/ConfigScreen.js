import React from 'react';
import { Canvas, TextField, Form, Button, FieldGroup } from 'datocms-react-ui';

export default function ConfigScreen({ ctx }) {
  const [token, setToken] = React.useState(ctx.plugin.attributes.parameters?.hubspotAccessToken || '');

  const save = async () => {
    await ctx.updatePluginParameters({ hubspotAccessToken: token });
    ctx.notice('Settings saved');
  };

  return (
    <Canvas ctx={ctx}>
      <Form onSubmit={(e) => { e.preventDefault(); save(); }}>
        <FieldGroup>
          <TextField
            id="hubspot-token"
            name="hubspot-token"
            label="HubSpot Private App Access Token"
            value={token}
            onChange={setToken}
            placeholder="pat-xxx..."
            hint="Your HubSpot Private App token with Files scope."
            required
          />
        </FieldGroup>
        <Button type="submit" buttonSize="s" buttonType="primary">Save settings</Button>
      </Form>
    </Canvas>
  );
}