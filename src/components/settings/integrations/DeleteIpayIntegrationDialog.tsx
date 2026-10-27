import { gql, useApolloClient } from '@apollo/client'

import { useCentralizedDialog } from '~/components/dialogs/CentralizedDialog'
import { addToast } from '~/core/apolloClient'
import { evictFromCache } from '~/core/apolloClient/evictFromCache'
import {
  DeleteIpayIntegrationDialogFragment,
  GetIpayIntegrationsListDocument,
  useDeleteIpayIntegrationMutation,
} from '~/generated/graphql'
import { useInternationalization } from '~/hooks/core/useInternationalization'

gql`
  fragment DeleteIpayIntegrationDialog on IpayProvider {
    id
    name
  }
  mutation deleteIpayIntegration($input: DestroyPaymentProviderInput!) {
    destroyPaymentProvider(input: $input) {
      id
    }
  }
`

type TDeleteIpayIntegrationDialogProps = {
  provider: DeleteIpayIntegrationDialogFragment | null
  callback?: () => void
}

export const useDeleteIpayIntegrationDialog = () => {
  const centralizedDialog = useCentralizedDialog()
  const { translate } = useInternationalization()
  const client = useApolloClient()

  const [deleteIpay] = useDeleteIpayIntegrationMutation()

  const openDeleteIpayIntegrationDialog = ({
    provider,
    callback,
  }: TDeleteIpayIntegrationDialogProps) => {
    centralizedDialog.open({
      title: translate('text_1749799070145vfvz9sq757a', { name: provider?.name }),
      description: translate('text_1793114148167pu7zn8pzr27'),
      colorVariant: 'danger',
      actionText: translate('text_1749799070145czycjo9guoq'),
      onAction: async () => {
        const result = await deleteIpay({
          variables: { input: { id: provider?.id as string } },
        })

        const destroyedId = result.data?.destroyPaymentProvider?.id

        if (destroyedId) {
          evictFromCache(client, {
            id: destroyedId,
            __typename: 'IpayProvider',
            listFieldName: 'paymentProviders',
            listQueryDocument: GetIpayIntegrationsListDocument,
          })

          callback?.()

          addToast({
            message: translate('text_1793114148167bsweqjhdebp'),
            severity: 'success',
          })
        }
      },
    })
  }

  return { openDeleteIpayIntegrationDialog }
}
